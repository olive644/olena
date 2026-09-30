import { createFirebaseRealtimeStore } from "../src/backend/firebase-realtime-store.js";
import { createRoomRecordingHandler } from "../src/backend/room-recording-handler.js";
import { createRoomGuard } from "../src/backend/room-guard.js";
import { createVercelHandler } from "../src/backend/vercel-adapter.js";

const store = createFirebaseRealtimeStore({
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
});

const handler = createRoomRecordingHandler({
  store,
  guard: createRoomGuard(
    store,
    "776947909599",
    process.env["FIREBASE_APP_ID"] ?? "",
    process.env["FIREBASE_APPCHECK_ENFORCE"] === "true",
  ),
});

export default createVercelHandler("/api/room-recording", handler);
