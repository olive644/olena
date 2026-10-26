import { discordSupport } from "./discord-support-runtime.js";
import { identifyProfileAccount, profileAllowedOrigins } from "./profile-handle-runtime.js";
import { checkRateLimit } from "./rate-limit.js";
import { createSupportHandler, deleteSupportAccount } from "./support-handler.js";
import { store } from "./support-store-runtime.js";

// Identidade fixa autorizada pelo proprietário. Nunca dar papel de atendente por @ editável.
const STAFF_HASHES = ["b1f899ba2ec489824196d6dfa851c7216e75843a99d1fbd421d02f32a5dfa26a"];
export const handleSupport = createSupportHandler({
  store,
  identify: identifyProfileAccount,
  allowedOrigins: profileAllowedOrigins,
  staffHashes: STAFF_HASHES,
  ...(discordSupport ? { relay: discordSupport } : {}),
  consume: async (uid, write) =>
    (await checkRateLimit(
      store,
      write ? "support-write-minute" : "support-read-minute",
      uid,
      write ? 10 : 30,
      60,
    )) &&
    (!write || (await checkRateLimit(store, "support-write-day", uid, 60, 86400))) &&
    (await checkRateLimit(store, "support-global-minute", "all", 1000, 60)) &&
    (!write || (await checkRateLimit(store, "support-global-write-day", "all", 2000, 86400))),
});
export function removeSupportAccount(uid: string) {
  return deleteSupportAccount(store, uid, discordSupport);
}
