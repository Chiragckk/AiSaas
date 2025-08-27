# QuickAI

A lightweight full‑stack web app that bundles four AI utilities:

* **Generate Article** (Gemini)
* **Review Resume** (Gemini)
* **Background Removal** (Clipdrop)
* **Object Removal / Cleanup** (Clipdrop)

Frontend is a simple React (CDN) page; backend is Node.js/Express calling **Google Gemini** and **Clipdrop** APIs.

---

## ✨ Features

* Prompt‑based article writer with tone & word‑count controls (Gemini 1.5)
* Recruiter‑style resume review with strengths, gaps, and ATS keywords (Gemini)
* 1‑click PNG background removal (Clipdrop Remove Background)
* Object removal with mask upload (Clipdrop Cleanup)
* Minimal dependencies, no frontend build step

---

## 🧱 Architecture

```
quickai/
├─ server/
│  ├─ index.js          # Express routes → Gemini / Clipdrop
│  ├─ package.json
│  └─ .env              # API keys (not committed)
└─ client/
   └─ index.html        # React (CDN) + Fetch calls to backend
```

---

## 🔐 Prerequisites

* **Node.js** v18+
* **Google API key** with access to **Generative Language API (Gemini)**

  * Create at: Google AI Studio → Get API key
* **Clipdrop API key**

  * From: [https://clipdrop.co/apis](https://clipdrop.co/apis) (Remove Background / Cleanup)

> Keep keys private. Never hardcode keys in client code.

---

## ⚙️ Setup

1. **Clone** the project

```bash
git clone <your-repo-url> quickai
cd quickai
```

2. **Backend**

```bash
cd server
npm install
cp .env.example .env   # or create new .env
```

Create `.env` with:

```env
GEMINI_API_KEY=YOUR_GOOGLE_API_KEY
CLIPDROP_API_KEY=YOUR_CLIPDROP_API_KEY
PORT=8080
```

3. **Frontend**
   No install needed. Files are static under `client/`.

---

## ▶️ Run locally

Terminal 1 – **server**

```bash
cd server
npm run dev   # or: npm start
```

Server runs at: `http://localhost:8080`

Terminal 2 – **client**
Open `client/index.html` directly in your browser (or serve statically):

```bash
# optional: serve with a simple static server
npx http-server ./client -p 5173
```

Then visit `http://localhost:5173`.

> The client expects the API at `http://localhost:8080`. If you change the port, also update `API_BASE` in `client/index.html`.

---

## 🛣️ API Endpoints

All routes are **server‑side**. The client calls these with `fetch`.

### 1) Generate Article (Gemini)

`POST /api/generate-article`

```json
{
  "topic": "The impact of AI on education",
  "words": 500,
  "tone": "concise"   // concise | formal | casual
}
```

**Response**

```json
{ "text": "...generated markdown/plain text..." }
```

### 2) Review Resume (Gemini)

`POST /api/review-resume`

```json
{
  "resumeText": "Paste your resume plain text here...",
  "targetRole": "Software Developer"
}
```

**Response**

```json
{ "text": "Summary, strengths, gaps, ATS keywords..." }
```

### 3) Remove Background (Clipdrop)

`POST /api/remove-background` (multipart/form‑data)

* **image**: file (jpeg/png)

**Response**: `image/png` (binary stream)

### 4) Object Removal / Cleanup (Clipdrop)

`POST /api/object-remove` (multipart/form‑data)

* **image**: file (jpeg/png)
* **mask**: file (png) — white where you want to remove, black keep

**Response**: `image/png` (binary stream)

---

## 🧪 cURL Examples

Generate article:

```bash
curl -X POST http://localhost:8080/api/generate-article \
  -H 'Content-Type: application/json' \
  -d '{"topic":"AI in healthcare","words":300,"tone":"formal"}'
```

Review resume:

```bash
curl -X POST http://localhost:8080/api/review-resume \
  -H 'Content-Type: application/json' \
  -d '{"resumeText":"Chirag — MERN projects...","targetRole":"Software Engineer"}'
```

Remove background:

```bash
curl -X POST http://localhost:8080/api/remove-background \
  -H 'Content-Type: multipart/form-data' \
  -F image=@/path/to/photo.jpg --output out.png
```

Object removal:

```bash
curl -X POST http://localhost:8080/api/object-remove \
  -H 'Content-Type: multipart/form-data' \
  -F image=@/path/to/photo.jpg \
  -F mask=@/path/to/mask.png --output cleaned.png
```

---

## 🔒 Security Notes

* Never expose API keys in the client. Keys live only in `server/.env`.
* Add **rate limiting** & **auth** if exposing publicly (e.g., Stripe login/subscriptions, JWT, Clerk, etc.).
* Set CORS to your domain when deployed.

---

## 🚀 Deploy

**Server**

* Render / Railway / Fly.io / VPS: set `GEMINI_API_KEY` and `CLIPDROP_API_KEY` as environment variables.
* Expose port matching your platform (default 8080).

**Client**

* Netlify / Vercel / GitHub Pages — just upload `client/`.
* Configure `API_BASE` in `client/index.html` to your server URL.

---

## 🐛 Troubleshooting

* **401/403 from Gemini**: Verify API key enabled for Generative Language API; check quota.
* **400 from Clipdrop**: Ensure correct form field names (`image` / `mask`) and supported formats.
* **CORS errors**: Set proper `cors()` config on server; ensure client points to correct API origin.
* **Binary responses**: Use `res.blob()` on client; set `Content-Type: image/png` on server.

---

## 📦 Example `.env.example`

```env
GEMINI_API_KEY=your_gemini_key
CLIPDROP_API_KEY=your_clipdrop_key
PORT=8080
```

---

## 📝 License

MIT — do what you want; attribution appreciated.

---

## 🙋‍♂️ Credits

* Google **Gemini** Generative Language API
* **Clipdrop** Remove Background & Cleanup APIs

> Need Stripe/razorpay subscription boilerplate or drag‑and‑drop mask editor? Open an issue and we’ll extend this.
