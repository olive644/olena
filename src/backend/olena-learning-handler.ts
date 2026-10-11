import { randomUUID, timingSafeEqual } from "node:crypto";
import { lessons, passesArithmeticCheck } from "../ai/olena-corpus.js";
import type { HelenaProvider } from "./helena-handler.js";
import type { KvStore } from "./kv-store.js";

type Draft = (typeof lessons)[number] & {
  answer: string;
  teacher: string;
  generatedAt: string;
  check: "arithmetic-only";
};
type State = { drafts: Draft[]; lease: string; until: number };
type Dependencies = {
  enabled: boolean;
  token: string;
  teacher: string;
  store: KvStore;
  provider: HelenaProvider;
  consume: () => Promise<boolean>;
};
const key = "olena-learning/public-corpus-v1";
const ttl = 365 * 86400;
const reply = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export function createLearningHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
    const actual = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${deps.token}`);
    if (
      deps.token.length < 64 ||
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    )
      return reply({ error: "unauthorized" }, 401);
    if (!deps.enabled) return reply({ error: "disabled" }, 503);
    // Nenhum prompt, UID ou fonte pode ser enviado pelo chamador.
    if ((await request.text()) !== "") return reply({ error: "body_not_allowed" }, 400);
    const read = deps.store.readVersion;
    const cas = deps.store.compareAndSet;
    if (!read || !cas) return reply({ error: "storage_unavailable" }, 503);
    let state: State | undefined;
    let ownedVersion = "";
    const lease = randomUUID();
    try {
      const snapshot = await read(key);
      state = snapshot.value
        ? (JSON.parse(snapshot.value) as State)
        : { drafts: [], lease: "", until: 0 };
      if (!Array.isArray(state.drafts) || state.drafts.length > lessons.length)
        throw new Error("Corpus inválido");
      if (state.until > Date.now()) return reply({ error: "busy" }, 409);
      state = { ...state, lease, until: Date.now() + 90_000 };
      if (!(await cas(key, JSON.stringify(state), ttl, snapshot.version)))
        return reply({ error: "busy" }, 409);
      ownedVersion = (await read(key)).version;
      const lesson = lessons.find((item) => !state?.drafts.some((draft) => draft.id === item.id));
      let generated = 0;
      if (lesson && (await deps.consume())) {
        const result = await deps.provider.generate({
          version: 1,
          capability: "explain",
          prompt: `${lesson.prompt} Inclua exatamente a referência ${lesson.reference}. Use até 120 palavras.`,
          sources: [],
          privacy: { consent: true, retention: "none" },
        });
        if (passesArithmeticCheck(result.answer, lesson.reference)) {
          state.drafts.push({
            ...lesson,
            answer: result.answer,
            teacher: deps.teacher,
            generatedAt: new Date().toISOString(),
            check: "arithmetic-only",
          });
          generated = 1;
        }
      }
      state.lease = "";
      state.until = 0;
      if (!(await cas(key, JSON.stringify(state), ttl, ownedVersion)))
        throw new Error("Corpus ocupado");
      ownedVersion = "";
      return reply({ version: 1, publicSynthetic: true, generated, drafts: state.drafts });
    } catch {
      return reply({ error: "learning_unavailable" }, 503);
    } finally {
      if (state && ownedVersion) {
        // Lease expira mesmo se o armazenamento falhar. Nunca sobrescreve outro job.
        state.lease = "";
        state.until = 0;
        await cas(key, JSON.stringify(state), ttl, ownedVersion).catch(() => false);
      }
    }
  };
}
