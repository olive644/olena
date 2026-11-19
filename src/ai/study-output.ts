// Saída da IA para flashcards, quiz e simulado da Biblioteca. O modelo devolve JSON; ele é dado NÃO
// confiável (pode vir com texto em volta, campos a mais, alternativas repetidas ou resposta fora
// da lista). Servidor e tela usam estas mesmas funções: o que não passa aqui nunca vira cartão nem
// questão. Sem DOM nem rede, para rodar nos dois lados.

export type StudyCard = { front: string; back: string };
export type StudyQuestion = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

export const MAX_STUDY_CARDS = 20;
export const MAX_STUDY_QUESTIONS = 20;
const MAX_FRONT = 300;
const MAX_BACK = 500;
const MAX_PROMPT = 600;
const MAX_OPTION = 240;
const MAX_EXPLANATION = 500;

/** Corpo JSON de uma resposta do modelo: tira cerca de código e texto antes e depois. */
export function extractJson(text: string): unknown {
  const unfenced = text.replace(/```(?:json)?/gi, "");
  const start = unfenced.search(/[[{]/);
  if (start < 0) return undefined;
  const open = unfenced[start]!;
  const end = unfenced.lastIndexOf(open === "{" ? "}" : "]");
  if (end <= start) return undefined;
  try {
    return JSON.parse(unfenced.slice(start, end + 1)) as unknown;
  } catch {
    return undefined;
  }
}

const clean = (value: unknown, max: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 0 && text.length <= max ? text : undefined;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

function listFrom(value: unknown, key: string): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  const inner = record?.[key];
  return Array.isArray(inner) ? inner : undefined;
}

const normalize = (text: string) =>
  text.toLocaleLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Flashcards válidos. Mínimo de 3: menos que isso é resposta ruim, não baralho. */
export function parseStudyCards(text: string, limit = MAX_STUDY_CARDS): StudyCard[] | undefined {
  const list = listFrom(extractJson(text), "cards");
  if (!list) return undefined;
  const seen = new Set<string>();
  const cards: StudyCard[] = [];
  for (const item of list) {
    const record = asRecord(item);
    const front = clean(record?.["front"], MAX_FRONT);
    const back = clean(record?.["back"], MAX_BACK);
    if (!front || !back || normalize(front) === normalize(back)) continue;
    if (seen.has(normalize(front))) continue;
    seen.add(normalize(front));
    cards.push({ front, back });
    if (cards.length >= limit) break;
  }
  return cards.length >= 3 ? cards : undefined;
}

/**
 * Questões de múltipla escolha válidas: número de alternativas pedido, sem repetição, resposta
 * dentro da lista. `optionCount` é 3 (fácil) ou 4. A letra na frente ("A)") é tirada.
 */
export function parseStudyQuestions(
  text: string,
  optionCount: number,
  limit = MAX_STUDY_QUESTIONS,
): StudyQuestion[] | undefined {
  const list = listFrom(extractJson(text), "questions");
  if (!list) return undefined;
  const seen = new Set<string>();
  const questions: StudyQuestion[] = [];
  for (const item of list) {
    const record = asRecord(item);
    const prompt = clean(record?.["question"] ?? record?.["prompt"], MAX_PROMPT);
    const rawOptions = record?.["options"];
    const answer = record?.["answer"];
    if (!prompt || !Array.isArray(rawOptions) || rawOptions.length !== optionCount) continue;
    const options = rawOptions.map((option) =>
      clean(
        typeof option === "string" ? option.replace(/^\(?[A-Ea-e][).:]\s+/, "") : option,
        MAX_OPTION,
      ),
    );
    if (options.some((option) => option === undefined)) continue;
    const finalOptions = options as string[];
    if (new Set(finalOptions.map(normalize)).size !== finalOptions.length) continue;
    if (typeof answer !== "number" || !Number.isInteger(answer)) continue;
    if (answer < 0 || answer >= finalOptions.length) continue;
    if (seen.has(normalize(prompt))) continue;
    seen.add(normalize(prompt));
    questions.push({
      prompt,
      options: finalOptions,
      answer,
      explanation: clean(record?.["explanation"], MAX_EXPLANATION) ?? "",
    });
    if (questions.length >= limit) break;
  }
  return questions.length >= 2 ? questions : undefined;
}
