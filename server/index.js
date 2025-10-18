// server/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import articlesRouter from './routes/articles.js';

const app = express();

// middlewares
app.use(cors({ 
    origin: true, credentials: true 
}));
app.use(express.json());

// routes
app.use('/api/articles', articlesRouter);

// connect Mongo (panggil SEKALI aja)
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`API running on :${PORT}`));
  })
  .catch((e) => {
    console.error('Mongo error:', e.message);
    process.exit(1);
  });
