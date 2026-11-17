import type { Language } from "./types";

// Afirmações falsas feitas a partir de frases verdadeiras do próprio arquivo, sem IA. Cada gerador
// muda uma coisa só (um número, uma negação, um antônimo, um termo ou a definição) e devolve
// undefined quando não consegue mudar com segurança. A frase de origem fica como explicação.

export type DefinitionParts = { term: string; verb: string; rest: string };

export type FalseContext = {
  /** Posição da frase no arquivo: varia qual gerador é tentado primeiro, sem sorteio. */
  index: number;
  language: Language;
  /** Números que aparecem no arquivo, para trocar por um que também seja do texto. */
  numbers: readonly string[];
  /** Definição que esta frase própria dá (quando dá). */
  own?: DefinitionParts;
  /** Definições de outras frases do arquivo. */
  definitions: readonly DefinitionParts[];
};

const NUMBER = /(?<![\p{L}\p{N}.,–-])\d{1,4}(?:[.,]\d+)?(?![\p{L}\p{N}–-])/gu;
const YEAR = /^(?:1\d{3}|20\d{2})$/;
const QUANTITY_UNIT =
  /^\s+(?:anos?|metros?|quil[ôo]metros?|km|kg|toneladas?|mil\b|milh[õo]es|bilh[õo]es|%|habitantes|pessoas|years?|meters?|tons?)/i;

/** Números de um texto, na forma em que aparecem. */
export function numbersIn(text: string): string[] {
  return [...text.matchAll(NUMBER)].map((match) => match[0]);
}

function sameCaseAs(model: string, word: string): string {
  return /^\p{Lu}/u.test(model) ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wholeWord(word: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, "iu");
}

function numberSwap(text: string, context: FalseContext): string | undefined {
  for (const match of text.matchAll(NUMBER)) {
    const original = match[0];
    if (match.index === 0 || /[.,]/.test(original)) continue;
    const value = Number(original);
    const start = match.index ?? 0;
    const after = text.slice(start + original.length);
    const before = text.slice(0, start);
    // Número colado a um nome próprio no meio da frase é nome de produto ("Altair 8800"), não dado.
    const previous = before.trimEnd().split(/\s+/).at(-1) ?? "";
    if (before.trimEnd().includes(" ") && /^\p{Lu}/u.test(previous)) continue;
    // "2000 anos" e "1000 metros" são quantidades, não datas.
    const isYear = YEAR.test(original) && !QUANTITY_UNIT.test(after);
    const decade = /(?:d[ée]cada de|anos)\s+$/i.test(before);
    let alternative: string | undefined;
    if (isYear) {
      const others = context.numbers.filter(
        (item) => YEAR.test(item) && Math.abs(Number(item) - value) >= 11,
      );
      const picked = others.length
        ? Number(others[context.index % others.length])
        : value + 13 + (context.index % 5) * 3;
      alternative = String(decade ? Math.round(picked / 10) * 10 : picked);
      if (Number(alternative) === value) alternative = String(value + 20);
    } else {
      const others = context.numbers.filter(
        (item) =>
          !/[.,]/.test(item) &&
          item.length === original.length &&
          item !== original &&
          !(YEAR.test(item) && YEAR.test(original)),
      );
      alternative = others.length
        ? others[context.index % others.length]
        : String(value < 10 ? value + 3 : Math.round(value * 1.5));
    }
    if (!alternative || alternative === original) continue;
    return text.slice(0, start) + alternative + text.slice(start + original.length);
  }
  return undefined;
}

const NEGATION_PT = /(?<![\p{L}])(?:nunca|nem|jamais|sem|nenhum|nenhuma)(?![\p{L}])/iu;
const NOT_ONLY_PT = /n[ãa]o\s+(?:s[óo]|apenas|somente)|n[ãa]o\s+[ée]\s+s[óo]/iu;
const AUXILIARY_PT =
  /(?<=\s)(é|são|foi|foram|era|eram|pode|podem|tem|têm|possui|possuem|usa|usam|permite|permitem|serve|servem|ocorre|ocorrem|faz|fazem|fica|ficam|precisa|precisam)(?=\s)/u;
const SUBORDINATOR_PT =
  /(?<![\p{L}])(?:que|quando|onde|enquanto|porque|embora|se|como|cujo|cuja|quem|qual|quais)(?![\p{L}])/iu;
const AUXILIARY_EN = /(?<=\s)(is|are|was|were)(?=\s)/u;

function negate(text: string, context: FalseContext): string | undefined {
  if (context.language === "en") {
    if (/\b(?:not|never|no|none|without)\b/i.test(text)) return undefined;
    if (!AUXILIARY_EN.test(text)) return undefined;
    return text.replace(AUXILIARY_EN, "$1 not");
  }
  if (/(?<![\p{L}])não(?![\p{L}])/iu.test(text)) {
    if (NEGATION_PT.test(text) || NOT_ONLY_PT.test(text)) return undefined;
    const removed = text.replace(/(?<![\p{L}])não\s+/iu, "");
    return removed === text ? undefined : removed;
  }
  if (NEGATION_PT.test(text)) return undefined;
  const verb = AUXILIARY_PT.exec(text);
  if (!verb) return undefined;
  // Verbo de oração subordinada ("o que é...", "quando foi...") não vira negação segura.
  if (SUBORDINATOR_PT.test(text.slice(0, verb.index))) return undefined;
  return text.replace(AUXILIARY_PT, "não $1");
}

const OPPOSITES: Record<Language, readonly (readonly [string, string])[]> = {
  pt: [
    ["maior", "menor"],
    ["maiores", "menores"],
    ["mais", "menos"],
    ["primeiro", "último"],
    ["primeira", "última"],
    ["antes", "depois"],
    ["aumenta", "diminui"],
    ["aumentam", "diminuem"],
    ["sempre", "nunca"],
    ["todos", "nenhum"],
  ],
  en: [
    ["larger", "smaller"],
    ["more", "less"],
    ["first", "last"],
    ["before", "after"],
    ["increases", "decreases"],
    ["always", "never"],
    ["all", "none"],
  ],
};

function opposite(text: string, context: FalseContext): string | undefined {
  for (const [a, b] of OPPOSITES[context.language]) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ] as const) {
      const hit = wholeWord(from).exec(text);
      if (hit)
        return (
          text.slice(0, hit.index) + sameCaseAs(hit[0], to) + text.slice(hit.index + hit[0].length)
        );
    }
  }
  return undefined;
}

function definitionSwap(text: string, context: FalseContext): string | undefined {
  const own = context.own;
  if (!own) return undefined;
  const others = context.definitions.filter(
    (item) => item.term.toLowerCase() !== own.term.toLowerCase() && item.rest !== own.rest,
  );
  if (!others.length) return undefined;
  const pick = others[context.index % others.length]!;
  const rest = pick.rest.replace(/[.\s]+$/, "");
  void text;
  return `${own.term} ${own.verb} ${rest}.`;
}

const MAKERS = [definitionSwap, numberSwap, negate, opposite] as const;

/** Uma versão falsa da frase, ou undefined se nenhum gerador conseguiu mudá-la com segurança. */
export function falseVersion(text: string, context: FalseContext): string | undefined {
  for (let step = 0; step < MAKERS.length; step += 1) {
    const maker = MAKERS[(context.index + step) % MAKERS.length]!;
    const result = maker(text, context);
    if (result && result !== text) return result;
  }
  return undefined;
}

const FUNCTION_WORDS_PT = new Set([
  "em",
  "sem",
  "tem",
  "item",
  "homem",
  "jovem",
  "origem",
  "imagem",
]);
const VERB_PT =
  /^(?:é|são|foi|foram|era|eram|está|estão|estava|estavam|tem|têm|teve|tinha|tinham|há|havia|pode|podem|podia|deve|devem|fez|faz|fazem|usa|usam|usou|permite|permitem|serve|servem|ocorre|ocorrem|fica|ficam|precisa|precisam|passou|passaram|chamou|ficou|virou|existe|existem|surge|surgem|aparece|aparecem|recebe|recebem|libera|liberam|produz|produzem|forma|formam|vê|vêm|vem|vai|vão|seria|seriam|será|serão|significa|significam)$/iu;
const VERB_SUFFIX_PT = /^\p{L}{3,}(?:ou|eu|iu|ava|avam|aram|eram|iram|iam|ndo|am)$/iu;
const VERB_EN =
  /^(?:is|are|was|were|has|have|had|can|could|will|would|does|do|did|may|might|must|should|became|made|used|called|built|began|invented|released)$/i;

/**
 * A frase parece uma afirmação completa? Barra títulos, cabeçalhos de tabela, linhas de linha do
 * tempo e listas coladas ("Início do projeto Apresentação pública Fim da operação"): exige
 * pontuação final, tamanho mínimo, poucas palavras com inicial maiúscula e um verbo.
 */
export function looksLikeStatement(text: string, language: Language): boolean {
  const clean = text.trim();
  if (!/[.!?]$/.test(clean)) return false;
  if (/[|\t]|^[\d\-*•#]/.test(clean)) return false;
  const tokens = clean.split(/\s+/);
  if (tokens.length < 6) return false;
  const bare = (token: string) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  const capitalized = tokens.slice(1).filter((token) => /^\p{Lu}\p{Ll}/u.test(bare(token)));
  if (capitalized.length / (tokens.length - 1) > 0.4) return false;
  let run = 0;
  for (const token of tokens) {
    run = /^\p{Lu}/u.test(bare(token)) ? run + 1 : 0;
    if (run >= 4) return false;
  }
  const words = tokens.map(bare).filter(Boolean);
  if (language === "en")
    return words.some((word) => VERB_EN.test(word) || /^\p{L}{3,}ed$/iu.test(word));
  return words.some(
    (word) =>
      VERB_PT.test(word) ||
      (!FUNCTION_WORDS_PT.has(word.toLowerCase()) &&
        !/(?:agem|igem|ugem|ção|são)$/iu.test(word) &&
        VERB_SUFFIX_PT.test(word)),
  );
}
