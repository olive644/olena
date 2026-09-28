import {
  createFirebasePublicRoomPublisher,
  createFirebaseAccessTokenProvider,
  createFirebaseRealtimeStore,
  firebasePublicStreamUrl,
} from "../src/backend/firebase-realtime-store.js";
import { createLocalRoomHandler } from "../src/backend/local-room-handler.js";
import { createVercelHandler } from "../src/backend/vercel-adapter.js";
import { createRoomGuard } from "../src/backend/room-guard.js";

const config = {
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    // No painel da Vercel, a chave é colada como uma única linha com "\n"
    // literais; o Realtime Database exige quebras de linha de verdade.
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
};

const accessToken = createFirebaseAccessTokenProvider(config);
const store = createFirebaseRealtimeStore(config, fetch, () => Date.now(), accessToken);
const handler = createLocalRoomHandler({
  store,
  guard: createRoomGuard(
    store,
    "776947909599",
    process.env["FIREBASE_APP_ID"] ?? "",
    process.env["FIREBASE_APPCHECK_ENFORCE"] === "true",
    (event) => console.info(JSON.stringify({ event: "room_protection", ...event })),
  ),
  observe: (event) => console.info(JSON.stringify({ event: "room_request", ...event })),
  publish: createFirebasePublicRoomPublisher(config, fetch, () => Date.now(), accessToken),
  streamUrl: (code) => firebasePublicStreamUrl(config, code),
});

export default createVercelHandler("/api/local-room", handler);
