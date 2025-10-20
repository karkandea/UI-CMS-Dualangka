import serverless from "serverless-http";
import { createApp } from "./_app.js";

const app = createApp();
export default serverless(app);
