import { handleAccountDevices } from "../src/backend/account-devices-runtime.js";
import { createVercelHandler } from "../src/backend/vercel-adapter.js";
export default createVercelHandler("/api/account-devices", handleAccountDevices);
