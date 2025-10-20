// DULU
// import admin from "firebase-admin";

// SEKARANG
import { admin } from "../_firebaseAdmin.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ ok: false, error: "NO_TOKEN" });

    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded; // bisa dipakai untuk cek role
    next();
  } catch (e) {
    console.error("AUTH ERR:", e?.message || e);
    res.status(401).json({ ok: false, error: "INVALID_TOKEN" });
  }
}


/*
import admin from 'firebase-admin';


if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function verifyFirebaseIdToken(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Missing token' });

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // { uid, email, ... }
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
*/