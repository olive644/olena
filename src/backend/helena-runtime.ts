import { createFirebaseAccountIdentity } from "./firebase-account-identity.js";
import { createFirebaseRealtimeStore } from "./firebase-realtime-store.js";
import { createHelenaHandler } from "./helena-handler.js";
import { createCloudflareTeacher } from "./helena-teacher.js";
import { checkRateLimit } from "./rate-limit.js";
import { createOlenaStudent, createProgressiveProvider } from "./olena-student.js";
import type { HelenaCapability } from "../ai/helena-contract.js";

const knownCapabilities: HelenaCapability[] = ["tutor", "explain", "summarize", "study-plan"];
const approved =
  process.env["OLENA_STUDENT_EVALUATED"] === "true"
    ? (process.env["OLENA_STUDENT_CAPABILITIES"] ?? "")
        .split(",")
        .filter((item): item is HelenaCapability =>
          knownCapabilities.includes(item as HelenaCapability),
        )
    : [];
const student =
  process.env["OLENA_STUDENT_ENDPOINT"] && process.env["OLENA_STUDENT_MODEL"]
    ? createOlenaStudent(
        process.env["OLENA_STUDENT_ENDPOINT"],
        process.env["OLENA_STUDENT_MODEL"],
        process.env["OLENA_STUDENT_TOKEN"] ?? "",
      )
    : undefined;

const store = createFirebaseRealtimeStore({
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
});
const identity = createFirebaseAccountIdentity(process.env["VITE_FIREBASE_PROJECT_ID"] ?? "");
const handler = createHelenaHandler({
  allowedOrigins: (process.env["HELENA_ALLOWED_ORIGINS"] ?? "https://olenastudy.vercel.app")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  async identifyClient(request) {
    return (await identity(request))?.uid ?? "";
  },
  rateLimiter: {
    async consume(uid) {
      return (
        (await checkRateLimit(store, "helena-user-minute", uid, 5, 60)) &&
        (await checkRateLimit(store, "helena-user-day", uid, 30, 86400)) &&
        (await checkRateLimit(store, "helena-global-day", "all", 300, 86400))
      );
    },
  },
  provider: createProgressiveProvider(
    createCloudflareTeacher({
      accountId: process.env["CLOUDFLARE_ACCOUNT_ID"] ?? "",
      token: process.env["CLOUDFLARE_API_TOKEN"] ?? "",
      model: process.env["OLENA_TEACHER_MODEL"] ?? "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
    }),
    student,
    approved,
  ),
});

export async function handleHelenaRuntime(request: Request) {
  try {
    return await handler(request);
  } catch {
    // Falha fechada, inclusive se a autenticação ou o limite compartilhado falhar.
    return new Response(
      JSON.stringify({
        version: 1,
        error: { code: "provider_unavailable", message: "A Helena está indisponível no momento." },
      }),
      { status: 503, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  }
}
