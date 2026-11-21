import { parseAllowedOrigins } from "../domain/site-origins.js";
import { createFirebaseAccountIdentity } from "./firebase-account-identity.js";
import { createFirebaseRealtimeStore } from "./firebase-realtime-store.js";
import { createHelenaHandler, type SpendOutcome } from "./helena-handler.js";
import { createCloudflareTeacher } from "./helena-teacher.js";
import { createStudyProvider } from "./helena-study.js";
import { checkRateLimit, refundRateLimit } from "./rate-limit.js";
import { adjustBudget, readBudgetUsed, reserveBudget } from "./neuron-budget.js";
import { acquireLock, claimRequest } from "./helena-guard.js";
import {
  ADDRESS_DAILY_NEURONS,
  GLOBAL_DAILY_NEURONS,
  REQUEST_MAX_NEURONS,
  credits,
  userDailyCap,
  type BudgetSnapshot,
  type RequestEstimate,
} from "./helena-budget.js";
import {
  ADDRESS_DAILY_LIMIT,
  DAY_SECONDS,
  USER_DAILY_REQUEST_LIMIT,
  USER_MINUTE_LIMIT,
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

// Contadores de gasto (em neurons) por pessoa, por rede e da conta toda.
const USER_NEURONS = "helena-user-neurons";
const ADDRESS_NEURONS = "helena-address-neurons";
const GLOBAL_NEURONS = "helena-global-neurons";
const deny = (limit: RateLimitName, window: number, extra = {}): RateLimitDenial => ({
  limit,
  retryAfterSeconds: secondsUntilReset(window),
  ...extra,
});

// Quem soltou a trava de um pedido por vez ao terminar: o pedido é o elo entre `consume` e `settle`.
const releases = new WeakMap<Request, () => Promise<void>>();

async function snapshot(uid: string): Promise<BudgetSnapshot> {
  const [userUsed, globalUsed] = await Promise.all([
    readBudgetUsed(store, USER_NEURONS, uid, DAY_SECONDS),
    readBudgetUsed(store, GLOBAL_NEURONS, "all", DAY_SECONDS),
  ]);
  const limit = Math.min(
    userDailyCap(globalUsed),
    Math.max(0, GLOBAL_DAILY_NEURONS - globalUsed) + userUsed,
  );
  return {
    usedNeurons: userUsed,
    limitNeurons: limit,
    remainingNeurons: Math.max(0, limit - userUsed),
    requestMaxNeurons: REQUEST_MAX_NEURONS,
    resetInSeconds: secondsUntilReset(DAY_SECONDS),
  };
}

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
  claimRequest: (uid, key) => claimRequest(store, uid, key),
  rateLimiter: {
    async consume(uid, request, _capability, estimate: RequestEstimate) {
      const address = clientAddress(request);
      const check = (name: string, who: string, limit: number, window: number) =>
        checkRateLimit(store, name, who, limit, window);
      // Rajada primeiro: são limites baratos de checar e protegem tudo o que vem depois.
      if (!(await check("helena-user-minute", uid, USER_MINUTE_LIMIT, 60)))
        return deny("user-minute", 60);
      if (!(await check("helena-user-day", uid, USER_DAILY_REQUEST_LIMIT, DAY_SECONDS)))
        return deny("user-day", DAY_SECONDS);
      if (
        address &&
        !(await check("helena-address-day", address, ADDRESS_DAILY_LIMIT, DAY_SECONDS))
      )
        return deny("address-day", DAY_SECONDS);
      const giveCounters = () =>
        Promise.all([
          refundRateLimit(store, "helena-user-minute", uid, 60).catch(() => {}),
          refundRateLimit(store, "helena-user-day", uid, DAY_SECONDS).catch(() => {}),
          address
            ? refundRateLimit(store, "helena-address-day", address, DAY_SECONDS).catch(() => {})
            : undefined,
        ]);
      // Um texto gigante não esvazia o dia: o pedido tem teto próprio.
      if (estimate.neurons > REQUEST_MAX_NEURONS) {
        await giveCounters();
        return deny("request-too-big", DAY_SECONDS, {
          requestCredits: credits(estimate.neurons),
          requestMaxCredits: credits(REQUEST_MAX_NEURONS),
        });
      }
      // Um pedido por vez por pessoa: rajada em paralelo não passa do orçamento antes de gastar.
      const release = await acquireLock(store, uid);
      if (!release) {
        await giveCounters();
        return deny("busy", 10);
      }
      const undo: (() => Promise<void>)[] = [];
      const fail = async (denial: RateLimitDenial) => {
        for (const step of undo) await step().catch(() => {});
        await release();
        await giveCounters();
        return denial;
      };
      // Orçamento em créditos: a pessoa, a rede e a conta toda. A parte da pessoa cresce quando o
      // dia está vazio e volta ao piso quando enche (`userDailyCap`).
      const globalUsed = await readBudgetUsed(store, GLOBAL_NEURONS, "all", DAY_SECONDS);
      const cap = userDailyCap(globalUsed);
      const mine = await reserveBudget(
        store,
        USER_NEURONS,
        uid,
        estimate.neurons,
        cap,
        DAY_SECONDS,
      );
      if (!mine.ok)
        return fail(
          deny("user-budget", DAY_SECONDS, {
            usedCredits: credits(mine.used),
            limitCredits: credits(cap),
          }),
        );
      undo.push(() => adjustBudget(store, USER_NEURONS, uid, -estimate.neurons, DAY_SECONDS));
      if (address) {
        const net = await reserveBudget(
          store,
          ADDRESS_NEURONS,
          address,
          estimate.neurons,
          ADDRESS_DAILY_NEURONS,
          DAY_SECONDS,
        );
        if (!net.ok) return fail(deny("address-budget", DAY_SECONDS));
        undo.push(() =>
          adjustBudget(store, ADDRESS_NEURONS, address, -estimate.neurons, DAY_SECONDS),
        );
      }
      const all = await reserveBudget(
        store,
        GLOBAL_NEURONS,
        "all",
        estimate.neurons,
        GLOBAL_DAILY_NEURONS,
        DAY_SECONDS,
      );
      if (!all.ok) return fail(deny("global-budget", DAY_SECONDS));
      releases.set(request, release);
      return true;
    },
    async settle(uid, request, _capability, outcome: SpendOutcome) {
      const address = clientAddress(request);
      // Acerta a reserva com o gasto de verdade. Falha nossa não é cobrada da pessoa nem da rede,
      // mas a entrada que o provedor já leu continua contando na conta toda.
      const mineDelta = (outcome.failed ? 0 : outcome.actual) - outcome.reserved;
      const globalDelta = (outcome.failed ? outcome.inputOnly : outcome.actual) - outcome.reserved;
      await Promise.all([
        adjustBudget(store, USER_NEURONS, uid, mineDelta, DAY_SECONDS).catch(() => {}),
        address
          ? adjustBudget(store, ADDRESS_NEURONS, address, mineDelta, DAY_SECONDS).catch(() => {})
          : undefined,
        adjustBudget(store, GLOBAL_NEURONS, "all", globalDelta, DAY_SECONDS).catch(() => {}),
        outcome.failed
          ? Promise.all([
              refundRateLimit(store, "helena-user-minute", uid, 60).catch(() => {}),
              refundRateLimit(store, "helena-user-day", uid, DAY_SECONDS).catch(() => {}),
              address
                ? refundRateLimit(store, "helena-address-day", address, DAY_SECONDS).catch(() => {})
                : undefined,
            ])
          : undefined,
      ]);
      const release = releases.get(request);
      releases.delete(request);
      await release?.().catch(() => {});
    },
    usage: (uid) => snapshot(uid),
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
