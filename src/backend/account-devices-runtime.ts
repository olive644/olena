import {
  createFirebaseAccessTokenProvider,
  createFirebaseRealtimeStore,
} from "./firebase-realtime-store.js";
import { identifyProfileAccount, profileAllowedOrigins } from "./profile-handle-runtime.js";
import { createAccountDevicesHandler, deviceAccountKey } from "./account-devices-handler.js";
import { checkRateLimit } from "./rate-limit.js";

const config = {
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
};
const store = createFirebaseRealtimeStore(
  config,
  fetch,
  Date.now,
  createFirebaseAccessTokenProvider(config),
);
export const removeAccountDevices = (uid: string) => store.del(deviceAccountKey(uid));
export const handleAccountDevices = createAccountDevicesHandler({
  store,
  identify: identifyProfileAccount,
  allowedOrigins: profileAllowedOrigins,
  consume: async (uid) =>
    (await checkRateLimit(store, "devices-minute", uid, 6, 60)) &&
    (await checkRateLimit(store, "devices-day", uid, 120, 86400)) &&
    (await checkRateLimit(store, "devices-global-day", "all", 20000, 86400)),
});
