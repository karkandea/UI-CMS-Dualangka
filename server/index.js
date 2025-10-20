// cms/server/index.js  (LOKAL RUNNER)
import "dotenv/config";
import { createApp } from "../api/_app.js";
import { connectDB } from "../api/_db.js";

const app = createApp();

(async () => {
  await connectDB();
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Local API running on :${PORT}`));
})();


/*
// server/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import articlesRouter from './routes/articles.js';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
];

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: false,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json());

// MOUNT routes (INI AJA)
app.use('/api/articles', articlesRouter);

// optional: healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`API running on :${PORT}`));
  })
  .catch((e) => {
    console.error('Mongo error:', e.message);
    process.exit(1);
  });
*/