import { createFirebaseRealtimeStore } from "./firebase-realtime-store.js";

// Banco único do atendimento, compartilhado pelo chat do aplicativo e pela ponte com o Discord.
export const store = createFirebaseRealtimeStore({
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
});
