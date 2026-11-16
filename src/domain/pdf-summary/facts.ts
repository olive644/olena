import { contentStems, isStopword, normalizeWord, stem, words } from "./portuguese";
import type { Language } from "./types";

// Fatos que dão forma ao resumo: definições, datas, números, avisos, termos-chave e perguntas.
// Tudo é reconhecido por padrões no texto do próprio arquivo, e nada é inventado.

export type Definition = { term: string; verb: string; plural: boolean; sentence: string };

const NOT_A_TERM = new Set([
  "ele",
  "ela",
  "eles",
  "elas",
  "isso",
  "isto",
  "aquilo",
  "esse",
  "essa",
  "esses",
  "essas",
  "este",
  "esta",
  "estes",
  "estas",
  "mas",
  "porem",
  "contudo",
  "assim",
  "tambem",
  "quando",
  "se",
  "como",
  "que",
  "onde",
  "por",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "ao",
  "aos",
  "para",
  "com",
  "sem",
  "ate",
  "apos",
  "antes",
  "depois",
  "entao",
  "logo",
  "portanto",
  "alem",
  "ja",
  "ainda",
  "tudo",
  "nada",
  "isso",
  "tal",
  "cada",
  "qual",
  "quais",
  "quem",
  "seu",
  "sua",
  "seus",
  "suas",
  "nosso",
  "nossa",
  "ser",
  "foi",
  "era",
  "e",
  "ou",
  "nem",
  "dessa",
  "desse",
  "desta",
  "deste",
  "nessa",
  "nesse",
]);
const ARTICLES = new Set(["o", "a", "os", "as", "um", "uma", "uns", "umas"]);
// Depois de "é" ou "são", uma definição começa com artigo ("é um componente...", "são os...").
// Sem isso, "A glicose é usada pela planta" (voz passiva) viraria "definição".
const DEFINING_STARTERS = new Set([
  "o",
  "a",
  "os",
  "as",
  "um",
  "uma",
  "uns",
  "umas",
  "todo",
  "toda",
  "todos",
  "todas",
  "aquele",
  "aquela",
  "qualquer",
  "esse",
  "essa",
  "este",
  "esta",
]);

const DEFINING_VERBS =
  "é|são|significa|significam|consiste em|consistem em|refere-se a|referem-se a|define-se como|" +
  "definem-se como|chama-se|chamam-se|denomina-se|denominam-se|designa|designam|corresponde a|" +
  "correspondem a|trata-se de|constitui|constituem";

const DEFINITION = new RegExp(
  `^(?<term>\\p{L}[^,;:()]{1,72}?)\\s+(?:\\([^)]{1,40}\\)\\s+)?(?<verb>${DEFINING_VERBS})\\s+(?<rest>.{15,})$`,
  "iu",
);
const COLON_DEFINITION = /^(?<term>\p{Lu}[\p{L}\- ]{2,40}):\s+(?<rest>\p{L}.{20,})$/u;

export function findDefinition(sentence: string): Definition | undefined {
  const colon = COLON_DEFINITION.exec(sentence);
  if (colon?.groups) {
    const term = colon.groups["term"]!.trim();
    if (term.split(/\s+/).length <= 5 && !NOT_A_TERM.has(normalizeWord(term.split(/\s+/)[0]!))) {
      return { term, verb: "é", plural: false, sentence };
    }
  }
  const match = DEFINITION.exec(sentence);
  if (!match?.groups) return undefined;
  const term = match.groups["term"]!.trim();
  const verb = match.groups["verb"]!.toLowerCase();
  const termWords = term.split(/\s+/);
  if (termWords.length > 8) return undefined;
  const first = normalizeWord(termWords[0]!);
  if (NOT_A_TERM.has(first) || /\d{3,}/.test(term)) return undefined;
  const meaningful = termWords.filter((word) => !ARTICLES.has(normalizeWord(word)));
  if (meaningful.length === 0) return undefined;
  const rest = match.groups["rest"]!.trim();
  const restFirst = normalizeWord(rest.split(/\s+/)[0] ?? "");
  if (/^(é|são)$/.test(verb) && !DEFINING_STARTERS.has(restFirst)) return undefined;
  const plural =
    /^(são|significam|consistem|referem-se|definem-se|chamam-se|denominam-se|designam|correspondem|constituem)/.test(
      verb,
    );
  return { term, verb, plural, sentence };
}

/** "O ENIAC" vira "o ENIAC" no meio de uma pergunta. */
function lowerArticle(term: string): string {
  const parts = term.split(/\s+/);
  const first = parts[0]!;
  if (ARTICLES.has(normalizeWord(first)) && /^\p{Lu}/u.test(first)) {
    parts[0] = first.toLowerCase();
  }
  return parts.join(" ");
}

export function definitionQuestion(definition: Definition): string {
  const term = lowerArticle(definition.term);
  if (/^significa/.test(definition.verb)) return `O que significa ${term}?`;
  if (/^consiste/.test(definition.verb)) return `Em que consiste ${term}?`;
  if (/^(chama|denomina)/.test(definition.verb)) return `Como se chama ${term}?`;
  return `O que ${definition.plural ? "são" : "é"} ${term}?`;
}

export type DateMention = { label: string; sortKey: number };

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
function romanToNumber(roman: string): number {
  let total = 0;
  for (let index = 0; index < roman.length; index += 1) {
    const value = ROMAN[roman[index]!] ?? 0;
    const next = ROMAN[roman[index + 1] ?? ""] ?? 0;
    total += value < next ? -value : value;
  }
  return total;
}

/** Datas citadas: anos, séculos e "N a.C.". O rótulo é como aparece no texto. */
export function findDates(sentence: string): DateMention[] {
  const found: DateMention[] = [];
  const century = /s[ée]culo\s+([IVXLC]{1,6})\b(\s*a\.?\s?C\.?)?/gi;
  for (const match of sentence.matchAll(century)) {
    const value = romanToNumber(match[1]!.toUpperCase());
    if (value > 0 && value <= 30) {
      const before = Boolean(match[2]);
      found.push({
        label: `século ${match[1]!.toUpperCase()}${before ? " a.C." : ""}`,
        sortKey: (before ? -1 : 1) * (value * 100 - 50),
      });
    }
  }
  const year = /(?<![\d.,R$])\b(\d{1,4})(?![\d.,]\d)(\s*(?:a\.?\s?C\.?|d\.?\s?C\.?))?/g;
  for (const match of sentence.matchAll(year)) {
    const value = Number(match[1]);
    const suffix = match[2]?.replace(/\s|\./g, "").toLowerCase() ?? "";
    const before = suffix.startsWith("a");
    const plausible = suffix ? value >= 1 && value <= 2100 : value >= 1000 && value <= 2100;
    if (!plausible) continue;
    const preceding = sentence.slice(Math.max(0, match.index - 16), match.index);
    const following = sentence.slice(
      match.index + match[0].length,
      match.index + match[0].length + 14,
    );
    if (/R\$\s?$/.test(preceding)) continue;
    // "mais de 2000 anos", "cerca de 1500 metros": é quantidade, não data.
    if (
      !suffix &&
      /(?:mais de|menos de|cerca de|quase|aproximadamente|pouco mais de|uns)\s*$/i.test(preceding)
    )
      continue;
    if (
      !suffix &&
      /^\s*(?:anos|mil|metros|km|kg|pessoas|habitantes|reais|d[óo]lares|toneladas|%|graus|vezes|unidades|palavras)/i.test(
        following,
      )
    )
      continue;
    const decade = /d[ée]cada de\s*$/i.test(preceding);
    found.push({
      label: suffix
        ? `${value} ${before ? "a.C." : "d.C."}`
        : decade
          ? `década de ${value}`
          : String(value),
      sortKey: before ? -value : value,
    });
  }
  const seen = new Set<string>();
  return found.filter((item) => (seen.has(item.label) ? false : (seen.add(item.label), true)));
}

const QUANTITY =
  /(?:\d+(?:[.,]\d+)?\s?%|R\$\s?\d|\d+(?:[.,]\d+)?\s?(?:km|cm|mm|kg|mg|ml|ha|°C|graus|bilh(?:ão|ões)|milh(?:ão|ões)|mil|metros|toneladas|litros|habitantes|anos)\b)/i;

export function hasQuantity(sentence: string): boolean {
  return QUANTITY.test(sentence);
}

const CUE =
  /\b(?:importante|aten[çc][ãa]o|cuidado|lembre-se|observe|note que|vale lembrar|vale ressaltar|fundamental|essencial|principal|principais|em resumo|resumindo|conclui-se|em suma|key|essential|in summary)\b/i;
const WARNING =
  /\b(?:aten[çc][ãa]o|cuidado|lembre-se|observa[çc][ãa]o|vale lembrar|vale ressaltar|n[ãa]o confunda|importante lembrar|importante notar|importante n[ãa]o|warning|remember)\b/i;

export function hasCue(sentence: string): boolean {
  return CUE.test(sentence);
}

export function isWarning(sentence: string): boolean {
  return WARNING.test(sentence);
}

const ANAPHORA =
  /^(?:ele|ela|eles|elas|isso|isto|aquilo|esse|essa|esses|essas|este|esta|estes|estas|nesse|nessa|neste|nesta|desse|dessa|deste|desta|tal|tais|assim|portanto|al[ée]m disso|por isso|dessa forma|desta forma|mas|por[ée]m|contudo|entretanto|todavia|e|ou|tamb[ée]m|he|she|they|this|that|these|those|however|but)\b/i;

export function dependsOnPrevious(sentence: string): boolean {
  return ANAPHORA.test(sentence);
}

export function isReferenceLike(sentence: string): boolean {
  return (
    /https?:\/\/|www\.|@\w+\.\w+/i.test(sentence) ||
    /\bet al\b|\bdoi\b|\bisbn\b|\bIn:\s|\bp\.\s?\d+(?:-\d+)?\b|\bv\.\s?\d+\b/i.test(sentence) ||
    /^\(?\s*\d{4}\s*\)?$/.test(sentence) ||
    /^\[\d+\]/.test(sentence) ||
    sentence.replace(/[^\d]/g, "").length > sentence.length * 0.35
  );
}

export type KeyTerm = { term: string; score: number };

const GENERIC_TERMS = new Set([
  "primeira",
  "primeiro",
  "primeiras",
  "primeiros",
  "anos",
  "pessoa",
  "pessoas",
  "forma",
  "formas",
  "parte",
  "partes",
  "vezes",
  "coisa",
  "coisas",
  "tipo",
  "tipos",
  "modo",
  "maneira",
  "grande",
  "grandes",
  "outro",
  "outros",
  "outra",
  "outras",
  "mesmo",
  "mesma",
  "novo",
  "nova",
  "novos",
  "novas",
  "ainda",
  "sempre",
  "hoje",
  "segundo",
  "segunda",
  "caso",
  "casos",
  "exemplo",
  "exemplos",
  "muito",
  "muita",
  "muitos",
  "muitas",
  "poucos",
  "algum",
  "alguma",
  "alguns",
  "algumas",
  "grande",
  "diferentes",
  "diferente",
  "principal",
  "principais",
  "geral",
  "tambem",
  "assim",
  "desde",
  "ponto",
  "pontos",
  "lado",
  "tempo",
  "mundo",
  "lugar",
  "fato",
  "fatos",
  "ideia",
  "ideias",
  "maioria",
  "meio",
  "fim",
  "inicio",
  "final",
  "dentro",
  "fora",
  "entre",
  "durante",
  "depois",
  "antes",
  "apenas",
  "cerca",
  "aproximadamente",
  "nesse",
  "nessa",
  "desse",
  "dessa",
]);

/** Termos mais importantes do arquivo: nomes próprios, siglas e palavras que se repetem. */
export function keyTerms(
  sentences: readonly string[],
  language: Language,
  limit: number,
): KeyTerm[] {
  const documentFrequency = new Map<string, number>();
  const frequency = new Map<string, number>();
  const surface = new Map<string, Map<string, number>>();
  const properCount = new Map<string, number>();
  const remember = (key: string, shown: string) => {
    const forms = surface.get(key) ?? new Map<string, number>();
    forms.set(shown, (forms.get(shown) ?? 0) + 1);
    surface.set(key, forms);
  };
  const usable = (normalized: string) =>
    normalized.length >= 4 &&
    !isStopword(normalized, language) &&
    !GENERIC_TERMS.has(normalized) &&
    !/^\d+$/.test(normalized);
  for (const sentence of sentences) {
    const tokens = words(sentence);
    const seen = new Set<string>();
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index]!;
      const normalized = normalizeWord(token);
      if (!usable(normalized)) continue;
      const isAcronym = token.length >= 2 && token === token.toUpperCase() && /\p{Lu}/u.test(token);
      // Maiúscula no começo da frase não indica nome próprio.
      const startsSentence = index === 0;
      const capitalized = /^\p{Lu}/u.test(token) && !startsSentence;
      const shown = startsSentence && !isAcronym ? token.toLowerCase() : token;
      const key = stem(token, language);
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
      if (capitalized || isAcronym) properCount.set(key, (properCount.get(key) ?? 0) + 1);
      if (!seen.has(key)) {
        documentFrequency.set(key, (documentFrequency.get(key) ?? 0) + 1);
        seen.add(key);
      }
      remember(key, shown);
      const next = tokens[index + 1];
      if (next && usable(normalizeWord(next))) {
        const nextProper = /^\p{Lu}/u.test(next) || next === next.toUpperCase();
        const pair = `${key} ${stem(next, language)}`;
        frequency.set(pair, (frequency.get(pair) ?? 0) + 1);
        if (capitalized && nextProper) properCount.set(pair, (properCount.get(pair) ?? 0) + 1);
        remember(pair, `${shown} ${startsSentence && !isAcronym ? next : next}`);
      }
    }
  }
  const total = Math.max(sentences.length, 1);
  const scored: { key: string; score: number; shown: string }[] = [];
  for (const [key, count] of frequency) {
    const isPair = key.includes(" ");
    const properPair = isPair && (properCount.get(key) ?? 0) >= 2;
    if (count < 2) continue;
    if (isPair && count < 3 && !properPair) continue;
    if (!isPair && (documentFrequency.get(key) ?? 0) < 2) continue;
    const parts = key.split(" ");
    const idf = parts.reduce(
      (sum, part) => sum + Math.log(1 + total / (documentFrequency.get(part) ?? 1)),
      0,
    );
    const forms = [...(surface.get(key) ?? [])].sort(
      (a, b) => b[1] - a[1] || a[0].length - b[0].length,
    );
    const shown = forms[0]?.[0] ?? key;
    const proper = (properCount.get(key) ?? 0) >= 1 ? 1.6 : 1;
    scored.push({ key, score: count * idf * (isPair ? 1.3 : 1) * proper, shown });
  }
  scored.sort((a, b) => b.score - a.score || a.shown.localeCompare(b.shown));
  const chosen: { key: string; shown: string; score: number }[] = [];
  for (const candidate of scored) {
    const parts = new Set(candidate.key.split(" "));
    const covered = chosen.some((existing) => {
      const existingParts = existing.key.split(" ");
      return [...parts].every((part) => existingParts.includes(part));
    });
    if (covered) continue;
    // Uma palavra solta que já aparece dentro de um termo composto escolhido não repete.
    chosen.push(candidate);
    if (chosen.length >= limit) break;
  }
  return chosen.map(({ shown, score }) => ({ term: shown, score }));
}

/** Para ordenar e comparar sem depender de acento ou caixa. */
export function sameStems(a: string, b: string, language: Language): boolean {
  const left = contentStems(a, language).join(" ");
  return left !== "" && left === contentStems(b, language).join(" ");
}
