import express from "express";
import { createApp } from "./_app.js";
import { connectDB } from "./_db.js";

await connectDB();           // konek sekali saat cold start
const app = createApp(express);
export default app;
