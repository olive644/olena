import { handleHelenaRuntime } from "../src/backend/helena-runtime.js";
import { createVercelHandler } from "../src/backend/vercel-adapter.js";

export const maxDuration = 60;

export default createVercelHandler("/api/helena", handleHelenaRuntime);
