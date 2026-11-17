import { parseAllowedOrigins } from "../domain/site-origins.js";
import { createFirebaseAccountIdentity } from "./firebase-account-identity.js";
import { createFirebaseRealtimeStore } from "./firebase-realtime-store.js";
import { createHelenaHandler } from "./helena-handler.js";
import { createCloudflareTeacher } from "./helena-teacher.js";
import { checkRateLimit } from "./rate-limit.js";
import {
  DAY_SECONDS,
  GLOBAL_DAILY_LIMIT,
  SUMMARY_GLOBAL_DAILY_LIMIT,
  SUMMARY_USER_DAILY_LIMIT,
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
      // 300 pedidos do dia e a Olena fica fora do ar para todos. Uma turma atrás do mesmo
      // endereço (30 alunos a 3 pedidos cada) ainda cabe em 100 por dia.
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
      if (address && !(await check("helena-address-day", address, 100, DAY_SECONDS)))
        return deny("address-day", DAY_SECONDS);
      // O resumo é o pedido mais caro: tem teto por pessoa e teto geral próprios, para não
      // esgotar a cota gratuita da Cloudflare e deixar o chat sem resposta.
      if (capability === "summarize") {
        if (!(await check("helena-summary-user-day", uid, SUMMARY_USER_DAILY_LIMIT, DAY_SECONDS)))
          return deny("summary-user-day", DAY_SECONDS);
        if (!(await check("helena-summary-day", "all", SUMMARY_GLOBAL_DAILY_LIMIT, DAY_SECONDS)))
          return deny("summary-day", DAY_SECONDS);
      }
      if (!(await check("helena-global-day", "all", GLOBAL_DAILY_LIMIT, DAY_SECONDS)))
        return deny("global-day", DAY_SECONDS);
      return true;
    },
  },
  provider: createMathGroundedProvider(
    createCloudflareTeacher({
      accountId: process.env["CLOUDFLARE_ACCOUNT_ID"] ?? "",
      token: process.env["CLOUDFLARE_API_TOKEN"] ?? "",
      model: process.env["OLENA_TEACHER_MODEL"] ?? "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
    }),
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
