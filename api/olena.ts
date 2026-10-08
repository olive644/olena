import { handleOlena } from "../src/backend/olena-handler.js";
import { createVercelHandler } from "../src/backend/vercel-adapter.js";

export default createVercelHandler("/api/olena", handleOlena);
