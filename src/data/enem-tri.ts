/** 3PL + EAP (40 pontos, -4 a 4). Portado da calculadora_ENEM, licença MIT.
 * A transformação de escala é empírica; não é um serviço oficial do Inep.
 * Atribuição e licença: public/third-party/enem-tri.txt.
 */
export type EnemLanguage = "english" | "spanish";
export type TriItem = {
  key: string;
  id: string;
  answer: string;
  a: number;
  b: number;
  c: number;
  excluded: boolean;
};
export type TriBundle = {
  year: number;
  day: number;
  area: string;
  variantId: string;
  officialUrl: string;
  answerUrl: string;
  examCode: string;
  scale: [number, number];
  items: TriItem[];
};
const AREA: Record<string, string> = {
  languages: "LC",
  humanities: "CH",
  nature: "CN",
  math: "MT",
};

export function validateTriBundle(value: unknown, variantId: string, section: string): TriBundle {
  if (!value || typeof value !== "object") throw new Error("Parâmetros inválidos");
  const b = value as TriBundle;
  if (
    b.variantId !== variantId ||
    b.area !== AREA[section] ||
    !Number.isInteger(b.year) ||
    !Array.isArray(b.items) ||
    b.items.length !== (section === "languages" ? 50 : 45) ||
    new Set(b.items.map((i) => i.key)).size !== b.items.length ||
    !Array.isArray(b.scale) ||
    b.scale.length !== 2 ||
    b.scale.some((n) => !Number.isFinite(n)) ||
    b.scale[1] <= 0
  )
    throw new Error("Caderno ou área incompatível");
  for (const i of b.items) {
    if (
      !i ||
      typeof i.key !== "string" ||
      !/^(q|english|spanish):\d+$/.test(i.key) ||
      typeof i.excluded !== "boolean"
    )
      throw new Error("Item inválido");
    if (
      !i.excluded &&
      (!/^[A-E]$/.test(i.answer) ||
        ![i.a, i.b, i.c].every(Number.isFinite) ||
        i.a <= 0 ||
        i.c < 0 ||
        i.c >= 1)
    )
      throw new Error("Parâmetro psicométrico inválido");
  }
  return b;
}

export function calculateEnemTri(
  bundle: TriBundle,
  section: string,
  answers: Record<string, string>,
  language: EnemLanguage,
) {
  validateTriBundle(bundle, bundle.variantId, section);
  const selected = bundle.items.filter(
    (i) => i.key.startsWith("q:") || i.key.startsWith(`${language}:`),
  );
  if (selected.length !== 45) throw new Error("A área deve conter 45 questões do idioma escolhido");
  const items = selected.filter((i) => !i.excluded);
  if (!items.length) throw new Error("Não há itens válidos");
  const hasAnswers = selected.some((i) => /^[A-E]$/.test(answers[`${section}:${i.key}`] ?? ""));
  const points = Array.from({ length: 40 }, (_, i) => -4 + (i * 8) / 39);
  const logs = points.map((theta) => {
    let sum = -0.5 * theta * theta;
    for (const item of items) {
      const z = item.a * (theta - item.b);
      const logistic = z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
      const p = Math.max(1e-9, Math.min(1 - 1e-9, item.c + (1 - item.c) * logistic));
      sum += answers[`${section}:${item.key}`] === item.answer ? Math.log(p) : Math.log1p(-p);
    }
    return sum;
  });
  const max = Math.max(...logs),
    weights = logs.map((v) => Math.exp(v - max)),
    normalizer = weights.reduce((a, b) => a + b, 0);
  const theta = points.reduce((sum, p, i) => sum + p * weights[i]!, 0) / normalizer;
  const standardError = Math.sqrt(
    points.reduce((sum, p, i) => sum + (p - theta) ** 2 * weights[i]!, 0) / normalizer,
  );
  const score = hasAnswers ? bundle.scale[0] + bundle.scale[1] * theta : 0;
  return {
    score: Math.round(score * 10) / 10,
    theta,
    standardError,
    correct: items.filter((i) => answers[`${section}:${i.key}`] === i.answer).length,
    total: items.length,
    method: "3PL-EAP" as const,
  };
}

let index: Promise<{ papers: Record<string, Record<string, string>> }> | undefined;
const bundles = new Map<string, Promise<TriBundle>>();
export async function loadEnemTriBundle(
  variantId: string,
  section: string,
): Promise<TriBundle | null> {
  index ??= fetch("/enem/tri/index.json").then(async (response) => {
    if (!response.ok) throw new Error("Índice TRI indisponível");
    return response.json();
  });
  let metadata: Awaited<NonNullable<typeof index>>;
  try {
    metadata = await index;
  } catch (error) {
    index = undefined;
    throw error;
  }
  const file = metadata.papers[variantId]?.[section];
  if (!file) return null;
  if (!/^[a-f0-9]{14}-(LC|CH|CN|MT)\.json$/.test(file)) throw new Error("Arquivo TRI inválido");
  const key = `${variantId}:${section}`;
  let promise = bundles.get(key);
  if (!promise) {
    promise = fetch(`/enem/tri/${file}`).then(async (response) => {
      if (!response.ok) throw new Error("Parâmetros TRI indisponíveis");
      return validateTriBundle(await response.json(), variantId, section);
    });
    bundles.set(key, promise);
    void promise.catch(() => bundles.delete(key));
  }
  return promise;
}
