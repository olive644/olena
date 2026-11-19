import { parseAllowedOrigins } from "../domain/site-origins.js";
import { createFirebaseAccountIdentity } from "./firebase-account-identity.js";
import { createFirebaseRealtimeStore } from "./firebase-realtime-store.js";
import { createHelenaHandler } from "./helena-handler.js";
import { createCloudflareTeacher } from "./helena-teacher.js";
import { createStudyProvider } from "./helena-study.js";
import { checkRateLimit, refundRateLimit } from "./rate-limit.js";
import { isStudyCapability } from "../ai/helena-contract.js";
import {
  ADDRESS_DAILY_LIMIT,
  DAY_SECONDS,
  GLOBAL_DAILY_LIMIT,
  STUDY_GLOBAL_DAILY_LIMIT,
  STUDY_USER_DAILY_LIMIT,
  secondsUntilReset,
  type RateLimitDenial,
  type RateLimitName,
} from "./helena-quota.js";
import { clientAddress } from "./client-address.js";
import { createMathGroundedProvider } from "./helena-math-provider.js";

const store = createFirebaseRealtimeStore({
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
});
const teacherConfig = {
  accountId: process.env["CLOUDFLARE_ACCOUNT_ID"] ?? "",
  token: process.env["CLOUDFLARE_API_TOKEN"] ?? "",
  model: process.env["OLENA_TEACHER_MODEL"] ?? "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
};
const identity = createFirebaseAccountIdentity(process.env["VITE_FIREBASE_PROJECT_ID"] ?? "");
const handler = createHelenaHandler({
  // Desligada por padrão: só o resumo usa a cota gratuita. HELENA_CHAT_ENABLED=true religa.
  get chatEnabled() {
    return process.env["HELENA_CHAT_ENABLED"] === "true";
  },
  allowedOrigins: parseAllowedOrigins(process.env["HELENA_ALLOWED_ORIGINS"]),
  async identifyClient(request) {
    // Contas anônimas são baratas de criar: com elas a cota por usuário não protegeria a cota
    // global. A Olena exige conta de verdade, como o resto das ações da conta.
    const account = await identity(request);
    return account && !account.anonymous ? account.uid : "";
  },
  rateLimiter: {
    async consume(uid, request, capability) {
      // O teto por endereço vem antes do global: sem ele, quem tem várias contas Google esgota os
      // pedidos do dia e a Olena fica fora do ar para todos.
      const address = clientAddress(request);
      const check = (name: string, identity: string, limit: number, window: number) =>
        checkRateLimit(store, name, identity, limit, window);
      const deny = (limit: RateLimitName, window: number): RateLimitDenial => ({
        limit,
        retryAfterSeconds: secondsUntilReset(window),
      });
      if (!(await check("helena-user-minute", uid, 5, 60))) return deny("user-minute", 60);
      if (!(await check("helena-user-day", uid, 30, DAY_SECONDS)))
        return deny("user-day", DAY_SECONDS);
      if (
        address &&
        !(await check("helena-address-day", address, ADDRESS_DAILY_LIMIT, DAY_SECONDS))
      )
        return deny("address-day", DAY_SECONDS);
      // Cada tipo (resumo, flashcards, quiz, simulado) tem 2 usos por dia por pessoa e um teto
      // global próprio, para um tipo não esgotar a cota dos outros.
      if (isStudyCapability(capability)) {
        if (
          !(await check(`helena-${capability}-user-day`, uid, STUDY_USER_DAILY_LIMIT, DAY_SECONDS))
        )
          return deny("study-user-day", DAY_SECONDS);
        if (
          !(await check(`helena-${capability}-day`, "all", STUDY_GLOBAL_DAILY_LIMIT, DAY_SECONDS))
        )
          return deny("study-day", DAY_SECONDS);
      }
      if (!(await check("helena-global-day", "all", GLOBAL_DAILY_LIMIT, DAY_SECONDS)))
        return deny("global-day", DAY_SECONDS);
      return true;
    },
    async refund(uid, request, capability) {
      // Devolve os contadores que o pedido gastou, sem deixar a falha de um erro esconder o outro.
      const address = clientAddress(request);
      const give = (name: string, identity: string, window: number) =>
        refundRateLimit(store, name, identity, window).catch(() => {});
      await Promise.all([
        give("helena-user-minute", uid, 60),
        give("helena-user-day", uid, DAY_SECONDS),
        address ? give("helena-address-day", address, DAY_SECONDS) : undefined,
        isStudyCapability(capability)
          ? give(`helena-${capability}-user-day`, uid, DAY_SECONDS)
          : undefined,
        isStudyCapability(capability)
          ? give(`helena-${capability}-day`, "all", DAY_SECONDS)
          : undefined,
        give("helena-global-day", "all", DAY_SECONDS),
      ]);
    },
  },
  provider: createStudyProvider(
    createMathGroundedProvider(createCloudflareTeacher(teacherConfig)),
    teacherConfig,
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
        error: { code: "provider_unavailable", message: "A Olena está indisponível no momento." },
      }),
      { status: 503, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  }
}
