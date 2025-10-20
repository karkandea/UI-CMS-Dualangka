// api/_db.js
import mongoose from "mongoose";

let cached = globalThis.__mongoose_conn;
if (!cached) cached = (globalThis.__mongoose_conn = { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI is not set");
    cached.promise = mongoose.connect(uri, { dbName: "dualangka" }).then(m => m.connection);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
