import { handleProfileHandle } from "../src/backend/profile-handle-runtime.js";
import { createVercelHandler } from "../src/backend/vercel-adapter.js";
export default createVercelHandler("/api/profile-handle", handleProfileHandle);
