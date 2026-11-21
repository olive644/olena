export const HELENA_API_VERSION = 1 as const;
const HELENA_MAX_PROMPT_LENGTH = 2_000;
export const HELENA_MAX_SOURCE_COUNT = 12;
const HELENA_MAX_SOURCE_LENGTH = 8_000;
// Uma prova de 17 páginas tem cerca de 31.000 caracteres: 36.000 a levam inteira ao modelo.
export const HELENA_MAX_TOTAL_SOURCE_LENGTH = 36_000;
/** Redação: o texto e, se houver, o tema. O editor limita o texto a 6.000 caracteres. */
export const HELENA_ESSAY_MAX_LENGTH = 6_000;
export const HELENA_ESSAY_MAX_SOURCES = 2;

export type HelenaCapability =
  "tutor" | "explain" | "summarize" | "study-plan" | "flashcards" | "quiz" | "exam" | "essay";

/** Os quatro pedidos da Biblioteca. São os únicos que a Olena atende e os que têm limite diário. */
export const STUDY_CAPABILITIES = ["summarize", "flashcards", "quiz", "exam"] as const;
export type StudyCapability = (typeof STUDY_CAPABILITIES)[number];
/** Correção de redação: atendida mesmo com a conversa desligada, com o mesmo orçamento de créditos. */
export const isEssayCapability = (value: string): value is "essay" => value === "essay";
export const isStudyCapability = (value: string): value is StudyCapability =>
  (STUDY_CAPABILITIES as readonly string[]).includes(value);
type HelenaSourceKind = "note" | "material" | "flashcard" | "task" | "goal";

type HelenaSelectedSource = {
  id: string;
  kind: HelenaSourceKind;
  title: string;
  content: string;
};

export type HelenaRequest = {
  version: typeof HELENA_API_VERSION;
  capability: HelenaCapability;
  prompt: string;
  subject?: { id: string; name: string };
  sources: HelenaSelectedSource[];
  privacy: {
    consent: true;
    retention: "none";
  };
};

export type HelenaResponse = {
  version: typeof HELENA_API_VERSION;
  requestId: string;
  answer: string;
  suggestions: string[];
  generatedAt: string;
};

export type HelenaErrorCode =
  "invalid_request" | "consent_required" | "rate_limited" | "provider_unavailable";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

const capabilities: readonly HelenaCapability[] = [
  "tutor",
  "explain",
  "summarize",
  "study-plan",
  "flashcards",
  "quiz",
  "exam",
  "essay",
];
const sourceKinds: readonly HelenaSourceKind[] = ["note", "material", "flashcard", "task", "goal"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(record).every((key) => keys.includes(key));
}

function isBoundedString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}

function isCapability(value: unknown): value is HelenaCapability {
  return typeof value === "string" && capabilities.includes(value as HelenaCapability);
}

function isSourceKind(value: unknown): value is HelenaSourceKind {
  return typeof value === "string" && sourceKinds.includes(value as HelenaSourceKind);
}

function parseSource(value: unknown): ParseResult<HelenaSelectedSource> {
  if (!isRecord(value) || !hasOnlyKeys(value, ["id", "kind", "title", "content"])) {
    return { ok: false, message: "Fonte selecionada inválida." };
  }
  if (!isBoundedString(value["id"], 160) || !isSourceKind(value["kind"])) {
    return { ok: false, message: "Identificação da fonte inválida." };
  }
  if (
    !isBoundedString(value["title"], 200) ||
    !isBoundedString(value["content"], HELENA_MAX_SOURCE_LENGTH)
  ) {
    return { ok: false, message: "Conteúdo da fonte inválido ou muito longo." };
  }
  return {
    ok: true,
    value: {
      id: value["id"],
      kind: value["kind"],
      title: value["title"].trim(),
      content: value["content"],
    },
  };
}

export function parseHelenaRequest(value: unknown): ParseResult<HelenaRequest> {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["version", "capability", "prompt", "subject", "sources", "privacy"])
  ) {
    return { ok: false, message: "Requisição inválida." };
  }
  if (value["version"] !== HELENA_API_VERSION || !isCapability(value["capability"])) {
    return { ok: false, message: "Versão ou capacidade inválida." };
  }
  if (!isBoundedString(value["prompt"], HELENA_MAX_PROMPT_LENGTH)) {
    return { ok: false, message: "Pedido vazio ou muito longo." };
  }
  if (!Array.isArray(value["sources"]) || value["sources"].length > HELENA_MAX_SOURCE_COUNT) {
    return { ok: false, message: "Quantidade de fontes inválida." };
  }

  const sources: HelenaSelectedSource[] = [];
  for (const source of value["sources"]) {
    const parsed = parseSource(source);
    if (!parsed.ok) return parsed;
    sources.push(parsed.value);
  }
  if (
    sources.reduce((total, source) => total + source.content.length, 0) >
    HELENA_MAX_TOTAL_SOURCE_LENGTH
  ) {
    return { ok: false, message: "O conjunto de fontes é muito longo." };
  }

  if (
    value["capability"] === "essay" &&
    (sources.length < 1 ||
      sources.length > HELENA_ESSAY_MAX_SOURCES ||
      sources[0]!.content.length > HELENA_ESSAY_MAX_LENGTH)
  ) {
    return { ok: false, message: "Redação inválida ou muito longa." };
  }

  if (
    !isRecord(value["privacy"]) ||
    !hasOnlyKeys(value["privacy"], ["consent", "retention"]) ||
    value["privacy"]["consent"] !== true ||
    value["privacy"]["retention"] !== "none"
  ) {
    return { ok: false, message: "Consentimento explícito é obrigatório." };
  }

  let subject: HelenaRequest["subject"];
  if (value["subject"] !== undefined) {
    if (
      !isRecord(value["subject"]) ||
      !hasOnlyKeys(value["subject"], ["id", "name"]) ||
      !isBoundedString(value["subject"]["id"], 160) ||
      !isBoundedString(value["subject"]["name"], 160)
    ) {
      return { ok: false, message: "Matéria inválida." };
    }
    subject = { id: value["subject"]["id"], name: value["subject"]["name"].trim() };
  }

  const request: HelenaRequest = {
    version: HELENA_API_VERSION,
    capability: value["capability"],
    prompt: value["prompt"].trim(),
    sources,
    privacy: { consent: true, retention: "none" },
  };
  if (subject) request.subject = subject;
  return { ok: true, value: request };
}

export function parseHelenaResponse(value: unknown): ParseResult<HelenaResponse> {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["version", "requestId", "answer", "suggestions", "generatedAt"]) ||
    value["version"] !== HELENA_API_VERSION ||
    !isBoundedString(value["requestId"], 160) ||
    !isBoundedString(value["answer"], 12_000) ||
    !Array.isArray(value["suggestions"]) ||
    value["suggestions"].length > 4 ||
    !value["suggestions"].every((item) => isBoundedString(item, 500)) ||
    !isBoundedString(value["generatedAt"], 80)
  ) {
    return { ok: false, message: "Resposta do serviço inválida." };
  }
  return {
    ok: true,
    value: {
      version: HELENA_API_VERSION,
      requestId: value["requestId"],
      answer: value["answer"],
      suggestions: [...value["suggestions"]],
      generatedAt: value["generatedAt"],
    },
  };
}
