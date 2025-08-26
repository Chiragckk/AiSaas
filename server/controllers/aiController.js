import { GoogleGenerativeAI } from "@google/generative-ai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import {v2 as cloudinary} from 'cloudinary';
import axios from "axios";
import FormData from "form-data";
import fs from "fs"
import pdf from 'pdf-parse/lib/pdf-parse.js'


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth;   // ✅ FIXED
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    // ✅ usage check
    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "You have reached your free usage limit. Please upgrade to premium.",
      });
    }

    // ✅ Save in DB
    await sql`
      INSERT INTO creations (user_id, prompt, content, type) 
      VALUES (${userId}, ${prompt}, ${content}, 'article')
    `;

    // ✅ Update free usage
    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: free_usage + 1 },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.error("❌ Gemini Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateBlogTitle = async (req, res) => { 
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    // ✅ Fix condition
    if (plan !== 'premium' && free_usage >= 10) {
      return res.json({ success: false, message: 'You have reached your free usage limit. Please upgrade to premium.' }); 
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    // ✅ Safely extract content
    const content = response.choices[0].message.content 

    await sql`
      INSERT INTO creations (user_id, prompt, content, type) 
      VALUES (${userId}, ${prompt}, ${content}, 'blog-title')
    `;

    if (plan !== 'premium') {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1 
        }
      });
    }

    res.json({ success: true, content });

  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
}

export const generateImage = async (req, res) => { 
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({ success: false, message: "This feature is only available for premium subscription." });
    }

    const formData = new FormData();
    formData.append("prompt", prompt);

    // ✅ Call ClipDrop
    const { data } = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",   // ← make sure endpoint is correct
      formData,
      {
        headers: {
          "x-api-key": process.env.CLIPDROP_API_KEY,
        },
        responseType: "arraybuffer",
      }
    );

    // ✅ Convert to base64
    const base64Image = `data:image/png;base64,${Buffer.from(data, "binary").toString("base64")}`;

    // ✅ Upload to Cloudinary (this is where it goes)
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: "clipdrop-images",
    });

    // ✅ Save to DB
    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish) 
      VALUES (${userId}, ${prompt}, ${uploadResponse.secure_url}, 'image', ${publish ?? false})
    `;

    res.json({ success: true, content: uploadResponse.secure_url });

  } catch (error) {
    console.error("❌ generateImage error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

export const removeImageBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({ success: false, message: "This feature is only available for premium subscription." });
    }

    if (!req.file) {
      return res.json({ success: false, message: "No image uploaded." });
    }

    // ✅ Send to Clipdrop
    const formData = new FormData();
    formData.append("image_file", fs.createReadStream(req.file.path));

    const clipdropRes = await axios.post("https://clipdrop-api.co/remove-background/v1", formData, {
      headers: {
        "x-api-key": process.env.CLIPDROP_API_KEY,
        ...formData.getHeaders(),
      },
      responseType: "arraybuffer", // <-- get raw image buffer
    });

    // ✅ Upload processed image to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "clipdrop-images" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(clipdropRes.data); // send buffer
    });

    // ✅ Save to DB
    await sql`
      INSERT INTO creations (user_id, prompt, content, type) 
      VALUES (${userId}, 'Remove background from image', ${result.secure_url}, 'image')
    `;

    res.json({ success: true, content: result.secure_url });
  } catch (error) {
    console.error("❌ Error removing background:", error.message);
    res.json({ success: false, message: error.message });
  }
};

export const removeImageObject = async (req, res) => { 
  try {
    const { userId } = req.auth();
    const { object } = req.body;   // ✅ fix
    const image = req.file;        // ✅ fix
    const plan = req.plan;

    // ✅ Only premium users allowed
    if (plan !== "premium") {
      return res.json({ success: false, message: "This feature is only available for premium subscription." });
    }

    if (!image) {
      return res.json({ success: false, message: "No image uploaded." });
    }

    // ✅ Upload to Cloudinary
    const { public_id } = await cloudinary.uploader.upload(image.path, {
      folder: "clipdrop-images",
    });

    // ✅ Generate transformed URL (remove object)
    const imageUrl = cloudinary.url(public_id, {
      transformation: [
        { effect: `gen_remove:${object}` }  // e.g., "gen_remove:person" or "gen_remove:tree"
      ],
      resource_type: "image",
      secure: true,  // ✅ ensure https
    });

    // ✅ Save to DB
    await sql`
      INSERT INTO creations (user_id, prompt, content, type) 
      VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')
    `;

    res.json({ success: true, content: imageUrl });

  } catch (error) {
    console.error("❌ removeImageObject error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

export const resumeReview = async (req, res) => {
  try {
    const { userId } = req.auth;   // ✅ fixed
    const resume = req.file;       // ✅ fixed
    const plan = req.plan;

    // ✅ Only premium users allowed
    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscription.",
      });
    }

    // ✅ Fix size check (5 MB = 5 * 1024 * 1024)
    if (resume.size > 5 * 1024 * 1024) {
      return res.json({
        success: false,
        message: "Resume file size exceeds the limit of 5MB.",
      });
    }

    // ✅ Extract PDF text
    const dataBuffer = fs.readFileSync(resume.path);
    const pdfData = await pdf(dataBuffer);

    // ✅ Prepare prompt
    const prompt = `
      Review the following resume and provide constructive feedback 
      on its strengths, weaknesses, and areas for improvement.

      Resume Content:
      ${pdfData.text}
    `;

    // ✅ Use Gemini SDK
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const content = result.response.text();

    // ✅ Save to DB
    await sql`
      INSERT INTO creations (user_id, prompt, content, type) 
      VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')
    `;

    res.json({ success: true, content });
  } catch (error) {
    console.error("❌ Resume Review Error:", error.message);
    res.json({ success: false, message: error.message });
  }
};
