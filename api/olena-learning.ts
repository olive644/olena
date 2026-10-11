import { createFirebaseRealtimeStore } from "../src/backend/firebase-realtime-store.js";
import { createLearningHandler } from "../src/backend/olena-learning-handler.js";
import { createCloudflareTeacher } from "../src/backend/helena-teacher.js";
import { checkRateLimit } from "../src/backend/rate-limit.js";
import { createVercelHandler } from "../src/backend/vercel-adapter.js";

export const maxDuration = 60;
const store = createFirebaseRealtimeStore({
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
});
const teacher = process.env["OLENA_TEACHER_MODEL"] ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
export default createVercelHandler(
  "/api/olena-learning",
  createLearningHandler({
    enabled: process.env["OLENA_LEARNING_FREE_CONFIRMED"] === "true",
    token: process.env["OLENA_LEARNING_SERVICE_TOKEN"] ?? "",
    teacher,
    store,
    provider: createCloudflareTeacher({
      accountId: process.env["CLOUDFLARE_ACCOUNT_ID"] ?? "",
      token: process.env["CLOUDFLARE_API_TOKEN"] ?? "",
      model: teacher,
    }),
    consume: async () =>
      (await checkRateLimit(store, "olena-learning-day", "public-corpus", 2, 86400)) &&
      (await checkRateLimit(store, "helena-global-day", "all", 300, 86400)),
  }),
);
