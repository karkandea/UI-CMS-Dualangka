import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import admin from "firebase-admin";

// Ensure both root .env and server/.env are loaded before we read any vars.
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv();
loadEnv({ path: join(__dirname, ".env") });
loadEnv({ path: join(__dirname, "../server/.env") });

let app;
if (!global.__FIREBASE_ADMIN_APP__) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin ENV. Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  global.__FIREBASE_ADMIN_APP__ = app;
} else {
  app = global.__FIREBASE_ADMIN_APP__;
}

export { admin, app };
