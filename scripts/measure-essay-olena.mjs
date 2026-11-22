// Medição de pesquisa (NÃO faz parte do app): quanto a nota estimada pela Olena concorda com a dos
// corretores humanos nas redações reservadas para teste (corpus Essay-BR, divisão por tema).
//
// Como rodar (a dona roda; a chave nunca fica no repositório nem passa por quem escreve o código):
//   1. node scripts/prepare-own-essay-corpus.mjs && python scripts/prepare_own_essay_data.py
//      (gera tmp/essay-own-grader/records.jsonl e prompts.json; tmp/ é ignorado pelo Git)
//   2. defina CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN no terminal (só na sessão)
//   (outro modelo: defina OLENA_MODEL, por exemplo @cf/meta/llama-3.3-70b-instruct-fp8-fast; o resultado
//    vai para tmp/essay-olena-measure-<modelo>/ e não se mistura com o do Llama 8B)
//   3. node scripts/measure-essay-olena.mjs --dry-run          (lista a amostra e o custo, sem rede)
//      node scripts/measure-essay-olena.mjs --count 120         (roda; guarda o progresso)
//
// Gasta a cota gratuita da conta (cerca de 10 neurons por redação, só nível e nota, não verificado):
// 120 redações ficam perto de 1.200 neurons. O script para ao chegar em --max-neurons (padrão 6000)
// e retoma no dia seguinte do ponto em que parou. Rode quando o app não estiver em uso.
//
// Regra de decisão, fixada ANTES de ver o resultado e que não muda depois (docs/REDACAO_IA.md):
// QWK médio >= 0,40 mostra a nota como estimativa; de 0,30 a 0,40 mostra uma faixa; abaixo de 0,30
// mostra só o nível por competência. A amostra é a mesma sempre (ordem por hash do id, sem escolha
// manual). O corpus são textos de terceiros: nunca versionar nem copiar para public/.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { build } from "rolldown";

const ROOT = "tmp/essay-own-grader";
const SEED = "olena-measure-v1";
const MAX_CHARS = 6_000;
// Neurons por milhão de tokens (entrada, saída), da página de preços da Cloudflare (21/11/2026).
// Modelo fora desta lista: informe OLENA_PRICE_IN e OLENA_PRICE_OUT (neurons por milhão de tokens).
const KNOWN_PRICES = {
  "@cf/meta/llama-3.1-8b-instruct-fp8-fast": [4_119, 34_868],
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": [26_668, 204_805],
  "@cf/meta/llama-4-scout-17b-16e-instruct": [24_545, 77_273],
  "@cf/mistralai/mistral-small-3.1-24b-instruct": [31_876, 50_488],
  "@cf/google/gemma-3-12b-it": [31_371, 50_560],
  "@cf/qwen/qwen3-30b-a3b-fp8": [4_625, 30_475],
};
const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
const model = process.env.OLENA_MODEL ?? DEFAULT_MODEL;
const known = KNOWN_PRICES[model];
const priceIn = Number(process.env.OLENA_PRICE_IN) || known?.[0];
const priceOut = Number(process.env.OLENA_PRICE_OUT) || known?.[1];
if (!priceIn || !priceOut) {
  console.error(
    `Modelo ${model} sem preço conhecido: defina OLENA_PRICE_IN e OLENA_PRICE_OUT (neurons por milhão de tokens).`,
  );
  process.exit(1);
}
const PRICES = { input: priceIn, output: priceOut };
// Cada modelo tem a sua pasta de progresso e de resultado: as medições não se misturam.
const OUT =
  model === DEFAULT_MODEL
    ? "tmp/essay-olena-measure"
    : `tmp/essay-olena-measure-${model.split("/").pop()}`;

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const dryRun = args.includes("--dry-run");
const retryFailed = args.includes("--retry-failed");
const count = Math.min(150, Math.max(1, Number(flag("--count", "120")) || 120));
const maxNeurons = Number(flag("--max-neurons", "6000")) || 6000;

if (!existsSync(`${ROOT}/records.jsonl`)) {
  console.error(`Faltam os dados em ${ROOT}. Rode os passos 1 do cabeçalho deste arquivo.`);
  process.exit(1);
}
const records = readFileSync(`${ROOT}/records.jsonl`, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const prompts = new Map(
  JSON.parse(readFileSync(`${ROOT}/prompts.json`, "utf8")).map((item) => [item.id, item.text]),
);
const eligible = records.filter((row) => row.split === "test" && row.text.length <= MAX_CHARS);
const skipped = records.filter((row) => row.split === "test").length - eligible.length;
const rank = (id) => createHash("sha256").update(`${SEED}:${id}`).digest("hex");
const sample = [...eligible].sort((a, b) => rank(a.id).localeCompare(rank(b.id))).slice(0, count);
const topicOf = (promptId) =>
  String(prompts.get(promptId) ?? "")
    .replace(/\s+/g, " ")
    .slice(0, 200);

console.log(
  `Teste: ${eligible.length} redações elegíveis (${skipped} acima de ${MAX_CHARS} caracteres ficam de fora). Amostra: ${sample.length}.`,
);
if (dryRun) {
  console.log(
    "--dry-run: nada foi enviado. Primeiros ids:",
    sample.slice(0, 5).map((r) => r.id),
  );
  process.exit(0);
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const token = process.env.CLOUDFLARE_API_TOKEN ?? "";
if (!accountId || !token) {
  console.error(
    "Defina CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN no terminal (nunca em arquivo).",
  );
  process.exit(1);
}

// O mesmo provedor e o mesmo validador do servidor, empacotados na hora (o código do app usa
// importações .js que o Node não resolve direto para .ts).
mkdirSync(OUT, { recursive: true });
writeFileSync(
  `${OUT}/entry.ts`,
  [
    'export { createEssayProvider } from "../../src/backend/helena-essay.js";',
    'export { quadraticWeightedKappa, scoreDisplayFor } from "../../src/domain/essay-qwk.js";',
  ].join("\n"),
);
await build({
  input: `${OUT}/entry.ts`,
  platform: "node",
  output: { file: `${OUT}/bundle.mjs`, format: "esm" },
  logLevel: "silent",
});
const { createEssayProvider, quadraticWeightedKappa, scoreDisplayFor } = await import(
  new URL(`../${OUT}/bundle.mjs`, import.meta.url)
);

// Guarda a resposta bruta e o gasto de CADA chamada (inclusive as que o validador recusa), para
// entender as falhas. A resposta é só JSON de níveis e notas, sem o texto da redação.
const captured = [];
const capturingFetch = async (...fetchArgs) => {
  const response = await fetch(...fetchArgs);
  try {
    const body = await response.clone().json();
    const reply = body?.result?.response;
    const usage = body?.result?.usage;
    captured.push({
      raw: (typeof reply === "string" ? reply : (JSON.stringify(reply) ?? "")).slice(0, 300),
      neurons: usage
        ? ((usage.prompt_tokens ?? 0) * PRICES.input +
            (usage.completion_tokens ?? 0) * PRICES.output) /
          1e6
        : 0,
    });
  } catch {
    // resposta que não é JSON: não há o que guardar
  }
  return response;
};
const provider = createEssayProvider(
  { generate: async () => ({ answer: "", suggestions: [] }) },
  { accountId, token, model },
  { allowScore: true },
  capturingFetch,
);

const progressFile = `${OUT}/progress.jsonl`;
const done = new Map(
  existsSync(progressFile)
    ? readFileSync(progressFile, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const row = JSON.parse(line);
          return [row.id, row];
        })
        // --retry-failed: as que falharam saem da lista e são refeitas (a nova linha vale).
        .filter(([, row]) => !(retryFailed && row.failed))
    : [],
);
let spent = 0;
for (const row of sample) {
  if (done.has(row.id)) continue;
  if (spent >= maxNeurons) {
    console.log(
      `Parei em ${spent.toFixed(0)} neurons (limite ${maxNeurons}). Rode de novo amanhã para continuar.`,
    );
    break;
  }
  const request = {
    version: 1,
    capability: "essay",
    prompt: "Comentar a redação por competência.",
    sources: [
      { id: "essay", kind: "material", title: "Redação", content: row.text },
      {
        id: "topic",
        kind: "note",
        title: "Tema",
        content: topicOf(row.prompt) || "Tema não informado",
      },
    ],
    privacy: { consent: true, retention: "none" },
  };
  let entry;
  captured.length = 0;
  try {
    const result = await provider.generate(request);
    const parsed = JSON.parse(result.answer);
    if (parsed.competencies.some((item) => item.score === undefined))
      throw new Error("A resposta veio sem nota em alguma competência");
    entry = {
      id: row.id,
      human: row.grades.map((points) => points / 40),
      model: parsed.competencies.map((item) => item.score / 40),
      levels: parsed.competencies.map((item) => item.level),
    };
  } catch (error) {
    entry = {
      id: row.id,
      failed: String(error?.message ?? error).slice(0, 80),
      raw: captured.map((call) => call.raw),
    };
  }
  const burned = captured.reduce((total, call) => total + call.neurons, 0);
  spent += burned;
  entry.neurons = Math.round(burned * 100) / 100;
  appendFileSync(progressFile, `${JSON.stringify(entry)}\n`);
  done.set(row.id, entry);
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}

const ok = [...done.values()].filter((entry) => entry.human);
const failed = [...done.values()].length - ok.length;
const names = ["C1", "C2", "C3", "C4", "C5"];
const perCompetency = names.map((_, index) =>
  quadraticWeightedKappa(
    ok.map((entry) => entry.human[index]),
    ok.map((entry) => entry.model[index]),
  ),
);
const defined = perCompetency.filter((value) => typeof value === "number");
const mean =
  defined.length === names.length ? defined.reduce((a, b) => a + b, 0) / defined.length : undefined;
const summary = {
  medidas: ok.length,
  falhas: failed,
  modelo: model,
  neuronsNestaRodada: Math.round(spent),
  qwkPorCompetencia: Object.fromEntries(names.map((name, i) => [name, perCompetency[i] ?? null])),
  qwkMedio: mean ?? null,
  exibicaoDaNota: scoreDisplayFor(mean),
  aviso:
    ok.length < 100
      ? "Menos de 100 redações medidas: não decide nada ainda."
      : "Decisão pela regra fixada no cabeçalho deste arquivo.",
};
writeFileSync(`${OUT}/result.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
