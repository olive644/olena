import { extractJson } from "./study-output.js";

// Saída da Olena para a correção de redação por competência (C1 a C5). O modelo devolve JSON e ele é
// dado NÃO confiável: campos a mais, níveis inventados, notas fora da escala ou trechos que a
// redação não tem. Servidor e tela usam estas mesmas funções. O que não passa aqui nunca aparece.
// Sem DOM nem rede, para rodar nos dois lados.

export const ESSAY_COMPETENCY_IDS = ["C1", "C2", "C3", "C4", "C5"] as const;
export type EssayCompetencyId = (typeof ESSAY_COMPETENCY_IDS)[number];

export const ESSAY_LEVELS = ["needs-work", "good", "great"] as const;
export type EssayLevel = (typeof ESSAY_LEVELS)[number];

/** Notas por competência da prova: 0 a 200 em passos de 40. */
export const ESSAY_SCORE_STEPS = [0, 40, 80, 120, 160, 200] as const;
export type EssayScore = (typeof ESSAY_SCORE_STEPS)[number];

export type EssayNote = {
  /** Trecho da própria redação que sustenta a observação, já conferido contra o texto. */
  quote?: string;
  comment: string;
};

export type EssayCompetencyReview = {
  id: EssayCompetencyId;
  level: EssayLevel;
  summary: string;
  notes: EssayNote[];
  /** Estimativa da IA; só existe com a chave da nota ligada. Nunca é a nota oficial. */
  score?: EssayScore;
};

export type EssayReview = {
  overall: string;
  competencies: EssayCompetencyReview[];
};

/** O editor limita a redação a este tamanho; o servidor recusa mais que isso. */
export const MAX_ESSAY_CHARS = 6_000;
const MAX_SUMMARY = 500;
const MAX_COMMENT = 400;
const MAX_OVERALL = 600;
const MAX_QUOTE = 240;
const MIN_QUOTE = 8;
const MAX_NOTES = 4;

const clean = (value: unknown, max: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 0 && text.length <= max ? text : undefined;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/** Caixa, acentos e espaços normalizados, para comparar o trecho citado com a redação. */
export const normalizeEssayText = (text: string): string =>
  text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

const isLevel = (value: unknown): value is EssayLevel =>
  typeof value === "string" && (ESSAY_LEVELS as readonly string[]).includes(value);

const isScore = (value: unknown): value is EssayScore =>
  typeof value === "number" && (ESSAY_SCORE_STEPS as readonly number[]).includes(value);

const isCompetencyId = (value: unknown): value is EssayCompetencyId =>
  typeof value === "string" && (ESSAY_COMPETENCY_IDS as readonly string[]).includes(value);

/**
 * Dois defeitos de formato frequentes do modelo, com conteúdo certo: aspas com barra invertida
 * (`{\"competencies\":...}`) e chaves ou colchetes finais esquecidos. Só consertamos a estrutura, nada do
 * conteúdo: níveis, notas e trechos continuam passando pela validação normal. Texto cortado no meio
 * de uma palavra ou de um número não é consertado.
 */
export function repairModelJson(text: string): string {
  let body = text.trim();
  if (/^s*{s*\\"/.test(body)) body = body.replace(/\\"/g, '"');
  const start = body.search(/[[{]/);
  if (start < 0) return body;
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (let index = start; index < body.length; index += 1) {
    const char = body[index]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{") stack.push("}");
    else if (char === "[") stack.push("]");
    else if ((char === "}" || char === "]") && stack[stack.length - 1] === char) stack.pop();
  }
  return inString || stack.length === 0 ? body : body + stack.reverse().join("");
}

/**
 * Correção validada, ou `undefined` se a resposta não serve. Exige as cinco competências, cada uma
 * uma vez, com nível dos três valores e resumo. Observações com trecho que a redação não contém são
 * descartadas (a IA não pode inventar evidência). A nota só é aceita com `allowScore` e dentro da
 * escala; fora disso o campo é descartado.
 *
 * Com `detail: false` (o pedido de hoje: só nível e nota, sem comentários) resumo, observações e
 * resumo geral não são exigidos nem guardados. Com `requireScore` (o servidor, quando a nota está
 * ligada) a nota das cinco competências é obrigatória; sem ela a resposta é refeita.
 */
export function parseEssayReview(
  text: string,
  essay: string,
  options: { allowScore: boolean; detail?: boolean; requireScore?: boolean },
): EssayReview | undefined {
  const detail = options.detail ?? true;
  const root = asRecord(extractJson(repairModelJson(text)));
  const list = root?.["competencies"];
  if (!root || !Array.isArray(list)) return undefined;
  const haystack = normalizeEssayText(essay);
  const byId = new Map<EssayCompetencyId, EssayCompetencyReview>();
  for (const item of list) {
    const record = asRecord(item);
    if (!record || !isCompetencyId(record["id"]) || byId.has(record["id"])) continue;
    const summary = detail ? clean(record["summary"], MAX_SUMMARY) : "";
    if (!isLevel(record["level"]) || summary === undefined || (detail && !summary)) continue;
    const notes: EssayNote[] = [];
    const rawNotes = detail && Array.isArray(record["notes"]) ? (record["notes"] as unknown[]) : [];
    for (const rawNote of rawNotes) {
      if (notes.length >= MAX_NOTES) break;
      const note = asRecord(rawNote);
      const comment = clean(note?.["comment"], MAX_COMMENT);
      if (!note || !comment) continue;
      const rawQuote = note["quote"];
      if (rawQuote === undefined || rawQuote === null || rawQuote === "") {
        notes.push({ comment });
        continue;
      }
      const quote = clean(rawQuote, MAX_QUOTE);
      if (!quote || quote.length < MIN_QUOTE || !haystack.includes(normalizeEssayText(quote)))
        continue;
      notes.push({ quote, comment });
    }
    const review: EssayCompetencyReview = {
      id: record["id"],
      level: record["level"],
      summary,
      notes,
    };
    if (options.allowScore && isScore(record["score"])) review.score = record["score"];
    else if (options.requireScore) continue;
    byId.set(record["id"], review);
  }
  if (ESSAY_COMPETENCY_IDS.some((id) => !byId.has(id))) return undefined;
  const overall = detail ? clean(root["overall"], MAX_OVERALL) : "";
  if (overall === undefined || (detail && !overall)) return undefined;
  return {
    overall,
    competencies: ESSAY_COMPETENCY_IDS.map((id) => byId.get(id) as EssayCompetencyReview),
  };
}
