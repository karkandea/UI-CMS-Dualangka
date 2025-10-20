import serverless from "serverless-http";
import { createApp } from "./_app.js";
import { connectDB } from "./_db.js";

await connectDB();           // konek sekali saat cold start
const app = createApp();
export default serverless(app);
