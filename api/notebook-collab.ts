import {
  createFirebaseCursorPublisher,
  createFirebasePublicRoomPublisher,
  createFirebaseRealtimeStore,
  firebasePublicStreamUrl,
} from "../src/backend/firebase-realtime-store.js";
import { createNotebookCollabHandler } from "../src/backend/notebook-collab-handler.js";
import { createFirebaseAccountIdentity } from "../src/backend/firebase-account-identity.js";
import { checkRateLimit } from "../src/backend/rate-limit.js";
import { createRoomGuard } from "../src/backend/room-guard.js";
import { createVercelHandler } from "../src/backend/vercel-adapter.js";

const config = {
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
};

const store = createFirebaseRealtimeStore(config);
const handler = createNotebookCollabHandler({
  store,
  authenticate: createFirebaseAccountIdentity(process.env["VITE_FIREBASE_PROJECT_ID"] ?? ""),
  // Cada link guarda até 4 MB por 7 dias no banco compartilhado: limite por conta e global.
  async consumeViewCreate(uid) {
    return (
      (await checkRateLimit(store, "notebook-view-create-hour", uid, 5, 3600)) &&
      (await checkRateLimit(store, "notebook-view-create-day", uid, 10, 86400)) &&
      (await checkRateLimit(store, "notebook-view-create-global-day", "all", 300, 86400))
    );
  },
  guard: createRoomGuard(
    store,
    "776947909599",
    process.env["FIREBASE_APP_ID"] ?? "",
    process.env["FIREBASE_APPCHECK_ENFORCE"] === "true",
  ),
  publish: createFirebasePublicRoomPublisher(config),
  publishCursor: createFirebaseCursorPublisher(config),
  streamUrl: (publicId) => firebasePublicStreamUrl(config, publicId),
});

export default createVercelHandler("/api/notebook-collab", handler);
