import express from 'express';
import cors from 'cors';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import 'dotenv/config';

import aiRouter from './routes/aiRoutes.js';
import connectCloudinary from './configs/cloudinary.js';
import userRouter from './routes/userRoutes.js';

const app = express();
await connectCloudinary();

// ✅ Allowed origins
const allowedOrigins = [
  "https://quick-ai-client-lovat.vercel.app", // your frontend
  "http://localhost:5173" // for local dev
];

// ✅ CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// ✅ JSON body size limit
app.use(express.json({ limit: "10mb" }));

// ✅ Clerk middleware
app.use(clerkMiddleware());

app.get('/', (req, res) => res.send('Server is Live 🚀'));

// ✅ Protected routes
app.use('/api/ai', requireAuth(), aiRouter);
app.use('/api/user', requireAuth(), userRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
});
