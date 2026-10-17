import { handleProfileSocial } from "../src/backend/profile-social-runtime.js";
import { createVercelHandler } from "../src/backend/vercel-adapter.js";
export default createVercelHandler("/api/profile-social", handleProfileSocial);
