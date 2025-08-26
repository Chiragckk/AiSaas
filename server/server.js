import express from 'express';
import cors from 'cors';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import 'dotenv/config';

import aiRouter from './routes/aiRoutes.js';
import connectCloudinary from './configs/cloudinary.js';
import userRouter from './routes/userRoutes.js';

const app = express();
await connectCloudinary();

// ✅ Proper CORS
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

// ✅ JSON body size limit
app.use(express.json({ limit: "10mb" }));

// ✅ Clerk middleware
app.use(clerkMiddleware());

app.get('/', (req, res) => res.send('Server is Live'));

// ✅ Require auth only where needed
app.use('/api/ai', requireAuth(), aiRouter);
app.use('/api/user', requireAuth(), userRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
});
