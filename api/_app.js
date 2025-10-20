import express from "express";
import cors from "cors";
import { connectDB } from "./_db.js";
import articlesRouter from "../../server/routes/articles.js"; // PAKAI router lama lo

// origin whitelist untuk dev+preview+prod
const allowed = new Set([
  "http://localhost:5173",  // web dev
  "http://localhost:5174",  // cms dev
  "http://localhost:5175",  // alt dev port
  "https://www.dualangka.com",
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;                 // server-to-server
  if (origin === "null") return true;
  if (allowed.has(origin)) return true;
  if (origin.endsWith(".vercel.app")) return true; // semua preview vercel
  return false;
}

export function createApp() {
  const app = express();

  app.use(cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS: " + origin));
    },
    credentials: false,
    methods: ["GET","POST","PUT","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"],
  }));

  app.use(express.json());

  // 1) konek DB sekali per request (sebelum router)
  app.use(async (req, _res, next) => {
    try { await connectDB(); next(); }
    catch (e) { next(e); }
  });

  // 2) healthcheck (serverless & lokal)
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  // 3) mount router lama
  app.use("/api/articles", articlesRouter);

  // 4) error handler sederhana
  app.use((err, _req, res, _next) => {
    console.error("ERR:", err?.message || err);
    res.status(500).json({ ok:false, error: err?.message || "Internal error" });
  });

  return app;
}
