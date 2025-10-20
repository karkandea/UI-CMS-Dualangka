import { admin } from '../_firebaseAdmin.js';

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
