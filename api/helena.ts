import { handleHelenaRuntime } from "../src/backend/helena-runtime.js";
import { createVercelHandler } from "../src/backend/vercel-adapter.js";

export default createVercelHandler("/api/helena", handleHelenaRuntime);
