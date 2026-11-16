import type { Language } from "./types";

// Texto em português (e o básico de inglês): palavras, radicais e frases. Nada daqui chama rede.

const PT_STOPWORDS = new Set(
  (
    "a o as os um uma uns umas de do da dos das dum duma duns dumas em no na nos nas num numa " +
    "por para pra pelo pela pelos pelas com sem sob sobre entre ate desde ao aos a as e ou mas " +
    "porem contudo todavia entretanto que se como quando onde porque pois logo portanto assim " +
    "ja nao sim tambem so apenas mais menos muito muita muitos muitas pouco pouca poucos poucas " +
    "mesmo mesma mesmos mesmas outro outra outros outras cada todo toda todos todas qualquer " +
    "ele ela eles elas eu tu voce voces nos nosso nossa nossos nossas seu sua seus suas meu minha " +
    "meus minhas teu tua teus tuas dele dela deles delas este esta estes estas esse essa esses " +
    "essas aquele aquela aqueles aquelas isto isso aquilo aqui ai ali la ca ser sao foi foram era " +
    "eram sera serao seja sejam sendo sido estar esta estao estava estavam estive esteve tem tinha " +
    "tinham ter tendo tido ha havia haver houve fazer faz fez feito pode podem podia poder deve " +
    "devem deveria dever vai vao ia iam ir vem vir apos antes durante quanto qual quais quem cujo " +
    "cuja cujos cujas ainda alem bem entao depois sempre nunca ate conforme segundo mediante " +
    "através atraves perante contra tal tais lhe lhes me te se nos vos"
  ).split(/\s+/),
);

const EN_STOPWORDS = new Set(
  (
    "a an the and or but if then than that this these those of to in on at by for with without " +
    "from into over under between about as is are was were be been being am do does did done has " +
    "have had having will would shall should can could may might must not no nor so too very just " +
    "it its he she they them their his her we our you your i me my who whom which what when where " +
    "why how all any both each few more most other some such only own same also there here"
  ).split(/\s+/),
);

const ABBREVIATIONS = new Set([
  "dr",
  "dra",
  "sr",
  "sra",
  "srta",
  "prof",
  "profa",
  "exmo",
  "exma",
  "ilmo",
  "ilma",
  "av",
  "etc",
  "ex",
  "p",
  "pp",
  "fig",
  "figs",
  "cap",
  "caps",
  "art",
  "arts",
  "sec",
  "séc",
  "vs",
  "no",
  "nº",
  "n",
  "ca",
  "aprox",
  "ed",
  "eds",
  "vol",
  "vols",
  "tel",
  "ltda",
  "cia",
  "sta",
  "sto",
  "cel",
  "gen",
  "min",
  "dep",
  "sen",
  "gov",
  "pres",
  "pe",
  "mons",
  "ver",
  "cf",
  "obs",
  "pag",
  "pág",
  "tab",
  "eq",
  "ref",
  "a.c",
  "d.c",
  "a.m",
  "p.m",
  "i.e",
  "e.g",
  "mr",
  "mrs",
  "ms",
  "st",
  "jr",
  "inc",
  "corp",
  "dept",
  "approx",
  "esp",
  "obs",
  "org",
  "orgs",
  "trad",
  "resp",
  "col",
  "cols",
  "inf",
  "sup",
  "dez",
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
]);

export function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}+/gu, "");
}

export function normalizeWord(word: string): string {
  return stripAccents(word.toLowerCase());
}

/** Palavras do texto, sem pontuação. Números entram (anos e quantidades importam). */
export function words(text: string): string[] {
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
}

export function countWords(text: string): number {
  return words(text).length;
}

export function isStopword(normalized: string, language: Language): boolean {
  return (language === "pt" ? PT_STOPWORDS : EN_STOPWORDS).has(normalized);
}

export function detectLanguage(sample: string): Language {
  let pt = 0;
  let en = 0;
  const tokens = words(sample.slice(0, 20_000));
  for (const token of tokens) {
    const word = normalizeWord(token);
    if (PT_STOPWORDS.has(word) && !EN_STOPWORDS.has(word)) pt += 1;
    else if (EN_STOPWORDS.has(word) && !PT_STOPWORDS.has(word)) en += 1;
  }
  return en > pt * 1.4 ? "en" : "pt";
}

const PT_DERIVATIONAL = [
  "amentos",
  "imentos",
  "amento",
  "imento",
  "adoras",
  "adores",
  "adora",
  "ador",
  "acoes",
  "acao",
  "idades",
  "idade",
  "ismos",
  "ismo",
  "istas",
  "ista",
  "ivas",
  "ivos",
  "iva",
  "ivo",
  "osas",
  "osos",
  "osa",
  "oso",
  "aveis",
  "avel",
  "iveis",
  "ivel",
  "mente",
] as const;

/** Radical leve, só para comparar frases entre si (nunca aparece no resumo). */
export function stem(word: string, language: Language): string {
  let value = normalizeWord(word);
  if (value.length <= 3) return value;
  if (language === "en") {
    for (const suffix of ["ing", "edly", "ed", "ly", "es", "s"]) {
      if (value.length - suffix.length >= 3 && value.endsWith(suffix)) {
        value = value.slice(0, -suffix.length);
        break;
      }
    }
    return value;
  }
  if (/(oes|aes|aos)$/.test(value)) value = value.replace(/(oes|aes|aos)$/, "ao");
  else if (/ns$/.test(value)) value = value.replace(/ns$/, "m");
  else if (value.length > 5 && /(ais|eis|ois|uis)$/.test(value)) value = value.slice(0, -2) + "l";
  else if (value.length > 5 && /[rz]es$/.test(value)) value = value.slice(0, -2);
  else if (/[^s]s$/.test(value)) value = value.slice(0, -1);
  for (const suffix of PT_DERIVATIONAL) {
    if (value.length - suffix.length >= 4 && value.endsWith(suffix)) {
      value = value.slice(0, -suffix.length);
      break;
    }
  }
  if (value.length > 4 && /[aeo]$/.test(value)) value = value.slice(0, -1);
  return value;
}

/** Radicais das palavras de conteúdo (sem palavras de ligação) de uma frase. */
export function contentStems(text: string, language: Language): string[] {
  const result: string[] = [];
  for (const token of words(text)) {
    const normalized = normalizeWord(token);
    if (normalized.length < 2 || isStopword(normalized, language)) continue;
    result.push(stem(token, language));
  }
  return result;
}

function endsWithAbbreviation(before: string): boolean {
  const match = /([\p{L}\p{N}.]+)$/u.exec(before);
  if (!match) return false;
  const token = match[1]!.toLowerCase();
  if (ABBREVIATIONS.has(token)) return true;
  if (/^\p{Lu}$/u.test(match[1]!)) return true;
  if (/^\p{L}$/u.test(token)) return true;
  if (/^(\p{L}\.){1,3}\p{L}$/u.test(token)) return true;
  return false;
}

/**
 * Divide um parágrafo em frases. Não corta em abreviações ("Dr.", "p. ex.", "a.C."), iniciais,
 * números decimais, numeração de lista nem quando a frase seguinte começa em minúscula.
 */
export function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences: string[] = [];
  let start = 0;
  const length = clean.length;
  for (let index = 0; index < length; index += 1) {
    const char = clean[index]!;
    if (char !== "." && char !== "!" && char !== "?" && char !== "…") continue;
    let end = index;
    while (end + 1 < length && /[.!?…]/.test(clean[end + 1]!)) end += 1;
    let closing = end;
    while (closing + 1 < length && /["”’')\]»]/.test(clean[closing + 1]!)) closing += 1;
    const next = clean.slice(closing + 1);
    const lead = /^\s+(["“‘'([«]?)([\p{L}\p{N}])/u.exec(next);
    if (!lead) {
      index = closing;
      continue;
    }
    const nextChar = lead[2]!;
    const startsUpper = /\p{Lu}|\p{N}/u.test(nextChar);
    const before = clean.slice(start, index);
    if (char === ".") {
      if (!startsUpper) {
        index = closing;
        continue;
      }
      if (endsWithAbbreviation(before)) {
        index = closing;
        continue;
      }
      if (/^\d{1,3}$/.test(before.trim())) {
        index = closing;
        continue;
      }
    } else if (!startsUpper) {
      index = closing;
      continue;
    }
    const sentence = clean.slice(start, closing + 1).trim();
    if (sentence) sentences.push(sentence);
    start = closing + 1;
    index = closing;
  }
  const rest = clean.slice(start).trim();
  if (rest) sentences.push(rest);
  return sentences;
}

const BACK_MATTER =
  /^(?:refer[êe]ncias(?:\s+bibliogr[áa]ficas)?|bibliografia|references|bibliography|sum[áa]rio|[íi]ndice|contents|table of contents|agradecimentos|ap[êe]ndices?|anexos?)$/i;

/** Seções que não têm conteúdo para resumir: referências, sumário, índice, agradecimentos. */
export function isBackMatterHeading(text: string): boolean {
  return BACK_MATTER.test(
    text
      .replace(/^[\d.\s]+/, "")
      .replace(/[:.]+$/, "")
      .trim(),
  );
}

/** Título sem a numeração do começo ("2.1 O ENIAC" vira "O ENIAC"). */
export function plainTitle(title: string): string {
  return title.replace(/^(?:\d{1,2}(?:\.\d{1,2}){0,3}|[IVXLC]{1,6})[.)]?\s+/, "").trim();
}
