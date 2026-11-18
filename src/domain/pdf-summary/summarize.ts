import {
  definitionQuestion,
  dependsOnPrevious,
  findDates,
  findDefinition,
  hasCue,
  hasQuantity,
  isReferenceLike,
  isExample,
  isFormula,
  isMisconception,
  isWarning,
  keyTerms,
  type Definition,
} from "./facts";
import type { CardOrigin } from "../flashcard-feedback";
import { falseVariant, looksLikeStatement, numbersIn, type DefinitionParts } from "./true-false";
import { isExam, parseExam } from "./exam";
import { examFlashcards, examProblem, examSummary } from "./exam-study";
import {
  contentStems,
  countWords,
  isBackMatterHeading,
  plainTitle,
  splitSentences,
  words,
} from "./portuguese";
import { LABELS, type Labels } from "./labels";
import type {
  Language,
  StructuredDocument,
  SummaryDetail,
  SummaryOptions,
  SummaryResult,
  SummaryStage,
} from "./types";

// Resumo por seleção: lê o documento já estruturado, dá nota às frases (importância no texto,
// termos centrais, posição, definições, datas) e monta um guia de estudo só com frases do próprio
// arquivo. Não reescreve nada, então não inventa nada.

type Sentence = {
  id: number;
  text: string;
  page: number;
  section: number;
  paragraph: number;
  position: number;
  paragraphSize: number;
  stems: string[];
  weights: Map<string, number>;
  norm: number;
  score: number;
  centrality: number;
  definition: Definition | undefined;
  dates: ReturnType<typeof findDates>;
  candidate: boolean;
  /** Frase anterior reservada para dar contexto a esta (quando ela começa com "Isso", "Ele"...). */
  context: number[];
  /** Item de lista do arquivo (marcador, tópico): entra como lista, não como frase solta. */
  item: boolean;
};

type Section = {
  title: string;
  startPage: number;
  endPage: number;
  subtopics: string[];
  sentences: Sentence[];
  chars: number;
  /** Tabelas do arquivo nesta seção (a primeira linha é o cabeçalho). */
  tables: string[][][];
  /** Linhas de fórmula ou equação do arquivo nesta seção. */
  formulas: string[];
};

type RawParagraph = { text: string; page: number; item?: boolean; table?: string[][] };

type RawSection = {
  title: string;
  startPage: number;
  endPage: number;
  subtopics: string[];
  parts: { sub: string | undefined; paragraphs: RawParagraph[] }[];
};

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function chars(paragraphs: readonly { text: string }[]): number {
  return paragraphs.reduce((total, paragraph) => total + paragraph.text.length, 0);
}

// ---------------------------------------------------------------------------------------------
// Seções

function sectionsFromHeadings(doc: StructuredDocument): RawSection[] {
  const headings = doc.blocks.filter((block) => block.kind === "heading");
  const level1 = headings.filter((block) => block.level === 1).length;
  const level2 = headings.filter((block) => block.level === 2).length;
  const sectionLevel = level1 >= 2 ? 1 : level2 >= 2 ? 2 : 1;
  const raw: RawSection[] = [];
  let current: RawSection | undefined;
  const preface: RawParagraph[] = [];
  let skipping = false;
  for (const block of doc.blocks) {
    if (block.kind === "heading") {
      if (isBackMatterHeading(block.text)) {
        skipping = true;
        if (block.level <= sectionLevel) current = undefined;
        continue;
      }
      if (block.level <= sectionLevel) skipping = false;
      if (skipping) continue;
      if (block.level <= sectionLevel) {
        current = {
          title: block.text,
          startPage: block.page,
          endPage: block.page,
          subtopics: [],
          parts: [{ sub: undefined, paragraphs: [] }],
        };
        raw.push(current);
      } else if (current) {
        current.subtopics.push(block.text);
        current.parts.push({ sub: block.text, paragraphs: [] });
      }
      continue;
    }
    if (skipping) continue;
    const paragraph: RawParagraph = {
      text: block.text,
      page: block.page,
      ...(block.item ? { item: true as const } : {}),
      ...(block.table ? { table: block.table } : {}),
    };
    if (!current) {
      preface.push(paragraph);
      continue;
    }
    current.parts[current.parts.length - 1]!.paragraphs.push(paragraph);
    current.endPage = Math.max(current.endPage, block.page);
  }
  if (preface.length > 0) {
    const first = raw[0];
    const prefaceChars = chars(preface);
    if (first && prefaceChars < 150) first.parts[0]!.paragraphs.unshift(...preface);
    else
      raw.unshift({
        title: LABELS[doc.language].intro,
        startPage: preface[0]!.page,
        endPage: preface[preface.length - 1]!.page,
        subtopics: [],
        parts: [{ sub: undefined, paragraphs: preface }],
      });
  }
  return raw;
}

function expandLongSections(raw: RawSection[]): RawSection[] {
  const result: RawSection[] = [];
  for (const section of raw) {
    const total = section.parts.reduce((sum, part) => sum + chars(part.paragraphs), 0);
    const named = section.parts.filter((part) => part.sub !== undefined);
    if (total > 12_000 && named.length >= 3) {
      section.parts.forEach((part, index) => {
        const text = part.paragraphs;
        if (text.length === 0) return;
        const pages = text.map((paragraph) => paragraph.page);
        const title = part.sub ? `${section.title}: ${part.sub}` : section.title;
        if (index === 0 && !part.sub) {
          result.push({
            title: section.title,
            startPage: Math.min(...pages),
            endPage: Math.max(...pages),
            subtopics: [],
            parts: [part],
          });
        } else {
          result.push({
            title,
            startPage: Math.min(...pages),
            endPage: Math.max(...pages),
            subtopics: [],
            parts: [{ sub: undefined, paragraphs: text }],
          });
        }
      });
    } else result.push(section);
  }
  return result;
}

function bagOf(text: string, language: Language): Map<string, number> {
  const bag = new Map<string, number>();
  for (const stem of contentStems(text, language)) bag.set(stem, (bag.get(stem) ?? 0) + 1);
  return bag;
}

function bagCosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const value of a.values()) na += value * value;
  for (const value of b.values()) nb += value * value;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [key, value] of small) dot += value * (large.get(key) ?? 0);
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Texto sem títulos: corta em trechos onde o vocabulário muda e dá um nome a cada trecho. */
function sectionsByTopic(doc: StructuredDocument): RawSection[] {
  const paragraphs = doc.blocks
    .filter((block) => block.kind === "paragraph")
    .map((block): RawParagraph => ({
      text: block.text,
      page: block.page,
      ...(block.item ? { item: true as const } : {}),
      ...(block.table ? { table: block.table } : {}),
    }));
  if (paragraphs.length === 0) return [];
  const total = chars(paragraphs);
  const wanted = Math.max(1, Math.min(12, Math.round(total / 5000)));
  const make = (slice: RawParagraph[], title: string): RawSection => ({
    title,
    startPage: slice[0]!.page,
    endPage: slice[slice.length - 1]!.page,
    subtopics: [],
    parts: [{ sub: undefined, paragraphs: slice }],
  });
  if (wanted === 1 || paragraphs.length < 4)
    return [make(paragraphs, LABELS[doc.language].mainPoints)];
  const bags = paragraphs.map((paragraph) => bagOf(paragraph.text, doc.language));
  const merge = (from: number, to: number) => {
    const merged = new Map<string, number>();
    for (let index = from; index <= to; index += 1) {
      for (const [key, value] of bags[index]!) merged.set(key, (merged.get(key) ?? 0) + value);
    }
    return merged;
  };
  const gaps: { at: number; similarity: number }[] = [];
  for (let index = 1; index < paragraphs.length; index += 1) {
    const left = merge(Math.max(0, index - 3), index - 1);
    const right = merge(index, Math.min(paragraphs.length - 1, index + 2));
    gaps.push({ at: index, similarity: bagCosine(left, right) });
  }
  const minimum = Math.max(1200, total / (wanted * 3));
  const cuts: number[] = [];
  const sizeBetween = (a: number, b: number) => chars(paragraphs.slice(a, b));
  for (const gap of [...gaps].sort((a, b) => a.similarity - b.similarity || a.at - b.at)) {
    if (cuts.length >= wanted - 1) break;
    const trial = [...cuts, gap.at].sort((a, b) => a - b);
    const bounds = [0, ...trial, paragraphs.length];
    const sizes = bounds.slice(1).map((end, index) => sizeBetween(bounds[index]!, end));
    if (sizes.every((size) => size >= minimum)) cuts.push(gap.at);
  }
  cuts.sort((a, b) => a - b);
  const bounds = [0, ...cuts, paragraphs.length];
  const sections: RawSection[] = [];
  for (let index = 0; index < bounds.length - 1; index += 1) {
    const slice = paragraphs.slice(bounds[index]!, bounds[index + 1]!);
    if (slice.length === 0) continue;
    const terms = keyTerms(
      slice.flatMap((paragraph) => splitSentences(paragraph.text)),
      doc.language,
      3,
    );
    const label = terms.map((term) => term.term.toLowerCase()).join(", ");
    sections.push(
      make(slice, label ? capitalize(label) : `${LABELS[doc.language].part} ${index + 1}`),
    );
  }
  return sections;
}

function foldTinySections(raw: RawSection[]): RawSection[] {
  const result: RawSection[] = [];
  for (const section of raw) {
    const size = section.parts.reduce((sum, part) => sum + chars(part.paragraphs), 0);
    const previous = result[result.length - 1];
    if (size < 150 && previous) {
      previous.parts[previous.parts.length - 1]!.paragraphs.push(
        ...section.parts.flatMap((part) => part.paragraphs),
      );
      previous.endPage = Math.max(previous.endPage, section.endPage);
      if (size > 0) previous.subtopics.push(section.title);
    } else result.push(section);
  }
  if (result.length > 1) {
    const first = result[0]!;
    const size = first.parts.reduce((sum, part) => sum + chars(part.paragraphs), 0);
    if (size < 150) {
      const second = result[1]!;
      second.parts[0]!.paragraphs.unshift(...first.parts.flatMap((part) => part.paragraphs));
      second.startPage = Math.min(second.startPage, first.startPage);
      result.shift();
    }
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// Frases e notas

function cleanSentence(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^[#>\-•*]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanItem(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^(?:[•▪◦·●○■*]|[-\u2013\u2014]|\d{1,2}[.)]|[a-zA-Z][.)])\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tabela do arquivo em Markdown (até 15 linhas e 6 colunas; células com "|" trocam por "/"). */
function tableLines(table: string[][]): string[] {
  const width = Math.min(6, Math.max(...table.map((row) => row.length)));
  if (width < 2 || table.length < 2) return [];
  const clean = (row: string[]) =>
    `| ${Array.from({ length: width }, (_, index) => (row[index] ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim() || " ").join(" | ")} |`;
  const [head, ...body] = table;
  return [
    clean(head ?? []),
    `| ${Array.from({ length: width }, () => "---").join(" | ")} |`,
    ...body.slice(0, 15).map(clean),
  ];
}

function withEnding(text: string): string {
  return /[.!?…]["”')\]]?$/.test(text) ? text : `${text}.`;
}

function pageLabel(start: number, end: number, labels: Labels): string {
  return start === end
    ? `${labels.page} ${start}`
    : `${labels.pages} ${start} ${labels.pageTo} ${end}`;
}

type Prepared = {
  sections: Section[];
  sentences: Sentence[];
  termWeights: Map<string, number>;
  language: Language;
};

function prepare(doc: StructuredDocument): Prepared {
  const hasHeadings = doc.blocks.some((block) => block.kind === "heading");
  let raw = hasHeadings ? sectionsFromHeadings(doc) : sectionsByTopic(doc);
  raw = foldTinySections(expandLongSections(raw));
  const sections: Section[] = [];
  const sentences: Sentence[] = [];
  let paragraphCounter = 0;
  raw.forEach((rawSection, sectionIndex) => {
    const section: Section = {
      title: rawSection.title,
      startPage: rawSection.startPage,
      endPage: rawSection.endPage,
      subtopics: rawSection.subtopics.slice(0, 8),
      sentences: [],
      chars: 0,
      tables: [],
      formulas: [],
    };
    for (const part of rawSection.parts) {
      for (const paragraph of part.paragraphs) {
        if (paragraph.table) {
          section.tables.push(paragraph.table);
          continue;
        }
        const formulaText = paragraph.item ? cleanItem(paragraph.text) : paragraph.text.trim();
        if (isFormula(formulaText)) {
          section.formulas.push(formulaText.replace(/\s+/g, " "));
          continue;
        }
        const pieces = paragraph.item
          ? [cleanItem(paragraph.text)].filter(Boolean)
          : splitSentences(paragraph.text).map(cleanSentence).filter(Boolean);
        pieces.forEach((text, position) => {
          const stems = contentStems(text, doc.language);
          const sentence: Sentence = {
            id: sentences.length,
            text,
            page: paragraph.page,
            section: sectionIndex,
            paragraph: paragraphCounter,
            position,
            paragraphSize: pieces.length,
            stems,
            weights: new Map(),
            norm: 0,
            score: 0,
            centrality: 0,
            definition: undefined,
            dates: [],
            candidate: false,
            context: [],
            item: paragraph.item === true,
          };
          sentences.push(sentence);
          section.sentences.push(sentence);
          section.chars += text.length;
        });
        paragraphCounter += 1;
      }
    }
    sections.push(section);
  });
  // TF-IDF por frase.
  const documentFrequency = new Map<string, number>();
  for (const sentence of sentences) {
    for (const stem of new Set(sentence.stems)) {
      documentFrequency.set(stem, (documentFrequency.get(stem) ?? 0) + 1);
    }
  }
  const total = Math.max(sentences.length, 1);
  const termWeights = new Map<string, number>();
  for (const sentence of sentences) {
    const counts = new Map<string, number>();
    for (const stem of sentence.stems) counts.set(stem, (counts.get(stem) ?? 0) + 1);
    let norm = 0;
    for (const [stem, count] of counts) {
      const weight =
        (1 + Math.log(count)) * Math.log(1 + total / (documentFrequency.get(stem) ?? 1));
      sentence.weights.set(stem, weight);
      norm += weight * weight;
      termWeights.set(stem, (termWeights.get(stem) ?? 0) + weight);
    }
    sentence.norm = Math.sqrt(norm);
    sentence.definition = sentence.item ? undefined : findDefinition(sentence.text);
    sentence.dates = findDates(sentence.text);
    const length = sentence.text.length;
    sentence.candidate =
      !sentence.item &&
      !/:$/.test(sentence.text) &&
      length >= 35 &&
      length <= 520 &&
      countWords(sentence.text) >= 5 &&
      !isReferenceLike(sentence.text) &&
      /^[\p{Lu}\p{N}"“'([]/u.test(sentence.text);
  }
  return { sections, sentences, termWeights, language: doc.language };
}

function similarity(a: Sentence, b: Sentence): number {
  if (!a.norm || !b.norm) return 0;
  const [small, large] = a.weights.size <= b.weights.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [stem, weight] of small.weights) {
    const other = large.weights.get(stem);
    if (other) dot += weight * other;
  }
  return dot / (a.norm * b.norm);
}

/** Importância de cada frase dentro do conjunto (TextRank sobre a semelhança entre frases). */
function centrality(list: Sentence[]): void {
  const count = list.length;
  if (count === 0) return;
  if (count === 1) {
    list[0]!.centrality = 1;
    return;
  }
  const postings = new Map<string, number[]>();
  list.forEach((sentence, index) => {
    for (const stem of sentence.weights.keys()) {
      const entry = postings.get(stem) ?? [];
      entry.push(index);
      postings.set(stem, entry);
    }
  });
  const limit = Math.max(20, Math.floor(count * 0.25));
  const neighbors: Map<number, number>[] = list.map(() => new Map());
  for (const entry of postings.values()) {
    if (entry.length < 2 || entry.length > limit) continue;
    for (let a = 0; a < entry.length; a += 1) {
      for (let b = a + 1; b < entry.length; b += 1) {
        neighbors[entry[a]!]!.set(entry[b]!, 0);
        neighbors[entry[b]!]!.set(entry[a]!, 0);
      }
    }
  }
  const edges: { to: number; weight: number }[][] = list.map(() => []);
  list.forEach((sentence, index) => {
    for (const other of neighbors[index]!.keys()) {
      if (other < index) continue;
      const value = similarity(sentence, list[other]!);
      if (value > 0.06) {
        edges[index]!.push({ to: other, weight: value });
        edges[other]!.push({ to: index, weight: value });
      }
    }
  });
  const outgoing = edges.map((row) => row.reduce((sum, edge) => sum + edge.weight, 0));
  let rank = new Array<number>(count).fill(1 / count);
  const damping = 0.85;
  for (let step = 0; step < 40; step += 1) {
    const next = new Array<number>(count).fill((1 - damping) / count);
    for (let index = 0; index < count; index += 1) {
      const share = outgoing[index]!;
      if (share === 0) continue;
      for (const edge of edges[index]!) {
        next[edge.to] = next[edge.to]! + (damping * rank[index]! * edge.weight) / share;
      }
    }
    let change = 0;
    for (let index = 0; index < count; index += 1) change += Math.abs(next[index]! - rank[index]!);
    rank = next;
    if (change < 1e-5) break;
  }
  const top = Math.max(...rank, 1e-9);
  list.forEach((sentence, index) => {
    sentence.centrality = rank[index]! / top;
  });
}

function scoreSection(prepared: Prepared, section: Section): void {
  centrality(section.sentences);
  const top = [...prepared.termWeights.values()].sort((a, b) => b - a).slice(0, 30);
  const reference = top.slice(0, 8).reduce((sum, value) => sum + value, 0) || 1;
  const topSet = new Set(
    [...prepared.termWeights.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([stem]) => stem),
  );
  const firstParagraph = section.sentences[0]?.paragraph ?? -1;
  for (const sentence of section.sentences) {
    let keyword = 0;
    for (const stem of new Set(sentence.stems)) {
      if (topSet.has(stem)) keyword += prepared.termWeights.get(stem) ?? 0;
    }
    keyword = Math.min(1, keyword / reference);
    const position =
      sentence.position === 0
        ? sentence.paragraph === firstParagraph
          ? 1
          : 0.6
        : sentence.position === 1
          ? 0.25
          : sentence.position === sentence.paragraphSize - 1 && sentence.paragraphSize >= 3
            ? 0.2
            : 0;
    const length = sentence.text.length;
    let penalty = 0;
    if (length < 50) penalty -= 0.25;
    if (length > 350) penalty -= (0.1 * (length - 350)) / 100;
    if (/\?["”')]?$/.test(sentence.text)) penalty -= 0.3;
    if (dependsOnPrevious(sentence.text)) penalty -= 0.12;
    // Nomes próprios e números dizem mais do que frases genéricas.
    const tokens = words(sentence.text);
    let entities = 0;
    tokens.forEach((token, index) => {
      if ((index > 0 && /^\p{Lu}/u.test(token)) || /^\d/.test(token)) entities += 1;
    });
    sentence.score =
      Math.min(0.09, 0.03 * entities) +
      0.45 * sentence.centrality +
      0.25 * keyword +
      0.07 * position +
      (sentence.definition ? 0.08 : 0) +
      (sentence.dates.length > 0 || hasQuantity(sentence.text) ? 0.05 : 0) +
      (hasCue(sentence.text) ? 0.05 : 0) +
      penalty;
  }
}

// ---------------------------------------------------------------------------------------------
// Seleção

const DETAIL = {
  short: { size: 0.5, ceiling: 0.4, words: 0.45, timeline: 0.1, minimum: 110 },
  medium: { size: 1, ceiling: 0.6, words: 0.8, timeline: 0.2, minimum: 200 },
  long: { size: 1.45, ceiling: 0.7, words: 0.9, timeline: 0.22, minimum: 200 },
} as const;

function targetCharacters(totalChars: number, detail: SummaryDetail): number {
  const { size, ceiling } = DETAIL[detail];
  const target = 11 * size * Math.pow(Math.max(totalChars, 1), 0.62);
  return Math.min(Math.max(target, 500 * Math.min(size, 1)), 30_000, totalChars * ceiling);
}

/** Escolhe frases de um conjunto, uma a uma, sem repetir ideias (MMR), até gastar o orçamento. */
function select(
  pool: Sentence[],
  all: Sentence[],
  budget: number,
  used: Set<number>,
  minimum = 1,
): Sentence[] {
  const chosen: Sentence[] = [];
  let spent = 0;
  const contextFor = (sentence: Sentence): Sentence[] | undefined => {
    if (!dependsOnPrevious(sentence.text)) return [];
    const chain: Sentence[] = [];
    let current = sentence;
    let length = 0;
    while (dependsOnPrevious(current.text)) {
      const previous = all[current.id - 1];
      if (
        !previous ||
        current.position === 0 ||
        previous.paragraph !== current.paragraph ||
        used.has(previous.id) ||
        chain.length >= 2
      )
        return undefined;
      length += previous.text.length;
      if (length > 520) return undefined;
      chain.unshift(previous);
      current = previous;
    }
    return chain;
  };
  const candidates = pool.filter((sentence) => sentence.candidate && !used.has(sentence.id));
  while (candidates.length > 0 && (spent < budget || chosen.length < minimum)) {
    let best: Sentence | undefined;
    let bestValue = -Infinity;
    for (const sentence of candidates) {
      if (used.has(sentence.id)) continue;
      // Frase que começa com "Isso", "Ele"... só entra se a anterior puder acompanhá-la.
      if (!contextFor(sentence)) continue;
      let redundancy = 0;
      for (const other of chosen) redundancy = Math.max(redundancy, similarity(sentence, other));
      const value = 0.75 * sentence.score - 0.25 * redundancy;
      if (value > bestValue) {
        bestValue = value;
        best = sentence;
      }
    }
    if (!best) break;
    const redundant = chosen.some((other) => similarity(best!, other) > 0.7);
    candidates.splice(candidates.indexOf(best), 1);
    if (redundant && chosen.length >= minimum) continue;
    const chain = contextFor(best) ?? [];
    for (const previous of chain) {
      used.add(previous.id);
      spent += previous.text.length;
    }
    best.context = chain.map((previous) => previous.id);
    chosen.push(best);
    used.add(best.id);
    spent += best.text.length;
    if (spent >= budget && chosen.length >= minimum) break;
  }
  return chosen;
}

/** Texto da frase, com as anteriores na frente quando foram reservadas para dar contexto. */
function withContext(sentence: Sentence, all: Sentence[]): string {
  const before = sentence.context
    .map((id) => all[id])
    .filter((previous): previous is Sentence => previous !== undefined)
    .map((previous) => withEnding(previous.text));
  return [...before, sentence.text].join(" ");
}

function whenQuestion(label: string, language: Language): string {
  if (language === "en") return `What happened in ${label}?`;
  if (/^século/i.test(label)) return `O que aconteceu no ${label}?`;
  if (/^década/i.test(label)) return `O que aconteceu na ${label}?`;
  return `O que aconteceu em ${label}?`;
}

function yearOf(sentence: Sentence): { label: string; sortKey: number } | undefined {
  return sentence.dates[0];
}

/** Notas de cada frase por seção, para conferir o que o resumo enxerga (usado nos testes). */
export function analyzeDocument(doc: StructuredDocument): {
  title: string;
  sentences: { text: string; score: number; centrality: number; candidate: boolean }[];
}[] {
  const prepared = prepare(doc);
  for (const section of prepared.sections) scoreSection(prepared, section);
  return prepared.sections.map((section) => ({
    title: section.title,
    sentences: section.sentences.map(({ text, score, centrality, candidate }) => ({
      text,
      score,
      centrality,
      candidate,
    })),
  }));
}

export async function summarizeDocument(
  doc: StructuredDocument,
  options: SummaryOptions = {},
): Promise<SummaryResult> {
  const progress = (fraction: number, stage: SummaryStage) => options.onProgress?.(fraction, stage);
  progress(0, "structuring");
  // Prova inteira: o resumo mostra as questões e o gabarito do arquivo, não frases soltas.
  const exam = parseExam(doc);
  if (isExam(exam)) {
    const markdown = examSummary(exam, doc.title);
    const words = countWords(markdown);
    return {
      title: doc.title,
      markdown,
      stats: {
        pages: doc.pages,
        sections: 1,
        sentences: exam.questions.length,
        selectedSentences: exam.questions.length,
        wordsIn: words,
        wordsOut: words,
        ratio: 1,
      },
    };
  }
  const prepared = prepare(doc);
  const { sections, sentences, language } = prepared;
  const wordsIn = sentences.reduce((sum, sentence) => sum + countWords(sentence.text), 0);
  await tick();

  for (let index = 0; index < sections.length; index += 1) {
    options.signal?.throwIfAborted();
    scoreSection(prepared, sections[index]!);
    progress(0.15 + 0.55 * ((index + 1) / sections.length), "ranking");
    if (index % 4 === 3) await tick();
  }

  const totalChars = sections.reduce((sum, section) => sum + section.chars, 0);
  const detail = options.detail ?? "medium";
  const L = LABELS[doc.language];
  const target = targetCharacters(totalChars, detail);
  const used = new Set<number>();
  const lines: string[] = [];
  const title = doc.title;
  lines.push(`# ${title}`);
  progress(0.75, "composing");

  const tiny = sentences.length <= 6;
  const standalone = (sentence: Sentence) =>
    sentence.candidate && !dependsOnPrevious(sentence.text);
  const sectionWeight = (section: Section) => Math.sqrt(section.chars);
  const weightSum = sections.reduce((sum, section) => sum + sectionWeight(section), 0) || 1;

  // Visão geral: a melhor frase de cada trecho, no máximo sete.
  const tops = sections
    .map((section) => ({
      section,
      best: section.sentences
        .filter(
          (sentence) =>
            standalone(sentence) &&
            !sentence.definition &&
            !isWarning(sentence.text) &&
            !isMisconception(sentence.text),
        )
        .sort((a, b) => b.score - a.score)[0],
    }))
    .filter((entry): entry is { section: Section; best: Sentence } => entry.best !== undefined);
  const overviewCount =
    detail === "short"
      ? Math.min(3, sections.length)
      : Math.min(7, Math.max(3, Math.ceil(sections.length / 2) + 1));
  const overviewPicks = [...tops]
    .sort(
      (a, b) => b.best.score * sectionWeight(b.section) - a.best.score * sectionWeight(a.section),
    )
    .slice(0, sections.length === 1 ? 3 : overviewCount);
  let overview: Sentence[];
  if (tiny) {
    overview = [];
  } else if (sections.length === 1) {
    overview = select(
      sections[0]!.sentences.filter((sentence) => !sentence.definition && standalone(sentence)),
      sentences,
      Math.min(target * 0.25, 700),
      used,
      2,
    );
  } else {
    // A visão geral repete de propósito a melhor frase de cada trecho: não tira nada das seções.
    overview = overviewPicks.map((entry) => entry.best);
  }
  overview.sort((a, b) => a.id - b.id);
  const overviewChars =
    sections.length === 1 ? overview.reduce((sum, sentence) => sum + sentence.text.length, 0) : 0;
  if (overview.length > 0) {
    lines.push(
      `> **${L.overview}** ${overview.map((sentence) => withEnding(withContext(sentence, sentences))).join(" ")}`,
    );
  }

  if (sections.length >= 3) {
    lines.push(`## ${L.route}`);
    for (const section of sections) {
      lines.push(`- **${section.title}** (${pageLabel(section.startPage, section.endPage, L)})`);
    }
  }

  // Linha do tempo: reservada antes das seções, para que as datas do arquivo não se percam.
  const timelineLimit = Math.min(14, Math.max(6, Math.round(sections.length * 1.5)));
  let timeline: Sentence[] = [];
  if (!tiny) {
    const dated = sentences
      .filter(
        (sentence) =>
          standalone(sentence) &&
          sentence.dates.length > 0 &&
          sentence.text.length <= 240 &&
          !isWarning(sentence.text) &&
          !isMisconception(sentence.text),
      )
      .sort((a, b) => b.score - a.score);
    const budget = wordsIn * DETAIL[detail].timeline;
    let spent = 0;
    for (const sentence of dated.slice(0, timelineLimit)) {
      const cost = countWords(sentence.text) + 2;
      if (spent + cost > budget) continue;
      timeline.push(sentence);
      spent += cost;
    }
    if (timeline.length < 3) timeline = [];
    timeline.sort((a, b) => yearOf(a)!.sortKey - yearOf(b)!.sortKey || a.id - b.id);
    for (const sentence of timeline) used.add(sentence.id);
  }
  const timelineChars = timeline.reduce((sum, sentence) => sum + sentence.text.length, 0);

  const selectedBySection: { section: Section; items: Sentence[] }[] = [];
  const definitionsSeen: Sentence[] = [];
  let sectionNumber = 0;
  for (const section of sections) {
    sectionNumber += 1;
    const budget = Math.max(
      DETAIL[detail].minimum,
      (Math.max(target - overviewChars - timelineChars, target * 0.4) * sectionWeight(section)) /
        weightSum,
    );
    const plain = plainTitle(section.title);
    const heading = sections.length === 1 && section.title === L.mainPoints ? L.mainPoints : plain;
    const label = sections.length === 1 ? heading : `${sectionNumber}. ${heading}`;
    lines.push(`## ${label} (${pageLabel(section.startPage, section.endPage, L)})`);
    if (section.subtopics.length > 0) {
      lines.push(`**${L.subtopics}:** ${section.subtopics.join("; ")}`);
    }
    // Lista do próprio arquivo: entra inteira (até 10 itens), com a frase que a anuncia.
    const listed = section.sentences.filter((sentence) => sentence.item).slice(0, 10);
    const listLead = (() => {
      const first = listed[0];
      const before = first ? sentences[first.id - 1] : undefined;
      return before && !before.item && before.section === first?.section && /:$/.test(before.text)
        ? before
        : undefined;
    })();
    if (listLead) used.add(listLead.id);
    const definitions = section.sentences
      .filter((sentence) => standalone(sentence) && sentence.definition && !used.has(sentence.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    for (const sentence of definitions) used.add(sentence.id);
    const mistakes = section.sentences
      .filter(
        (sentence) =>
          standalone(sentence) && isMisconception(sentence.text) && !used.has(sentence.id),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 1);
    for (const sentence of mistakes) used.add(sentence.id);
    const warnings = section.sentences
      .filter(
        (sentence) => standalone(sentence) && isWarning(sentence.text) && !used.has(sentence.id),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 1);
    for (const sentence of warnings) used.add(sentence.id);
    const examples = section.sentences
      .filter(
        (sentence) =>
          standalone(sentence) &&
          isExample(sentence.text) &&
          !sentence.definition &&
          !used.has(sentence.id),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 1);
    for (const sentence of examples) used.add(sentence.id);
    const spentOnBoxes = [
      ...definitions,
      ...mistakes,
      ...warnings,
      ...examples,
      ...listed,
      ...(listLead ? [listLead] : []),
    ].reduce((sum, item) => sum + item.text.length, 0);
    const chosen = select(
      section.sentences,
      sentences,
      Math.max(120, tiny ? totalChars * 0.65 : budget - spentOnBoxes),
      used,
      1,
    );
    const ordered = [...chosen].sort((a, b) => a.id - b.id);
    // Abertura em parágrafo corrido; o ponto essencial é a melhor das demais frases.
    const openingCount = ordered.length >= 4 ? 2 : 1;
    const opening = ordered.slice(0, openingCount);
    const others = ordered.slice(openingCount);
    const central = [...others].sort((a, b) => b.score - a.score)[0];
    const supporting = others.filter((sentence) => sentence !== central);
    if (opening.length > 0) {
      lines.push(opening.map((sentence) => withEnding(withContext(sentence, sentences))).join(" "));
    }
    if (listed.length > 0) {
      if (listLead) lines.push(withEnding(listLead.text.replace(/:$/, "")).replace(/\.$/, ":"));
      for (const item of listed) {
        used.add(item.id);
        lines.push(`- ${item.text.replace(/[.;]$/, "")}`);
      }
    }
    for (const table of section.tables.slice(0, 3)) lines.push(...tableLines(table));
    for (const formula of section.formulas.slice(0, 8))
      lines.push(`- **${L.formula}:** ${formula}`);
    for (const sentence of supporting) {
      lines.push(`- ${withEnding(withContext(sentence, sentences))}`);
    }
    for (const sentence of definitions) {
      lines.push(
        `> **${L.definition}: ${(sentence.definition?.term ?? "").replace(/^(?:o|a|os|as|um|uma)\s+/i, "")}** ${withEnding(sentence.text)}`,
      );
      definitionsSeen.push(sentence);
    }
    for (const sentence of mistakes) lines.push(`> **${L.mistake}** ${withEnding(sentence.text)}`);
    for (const sentence of warnings) lines.push(`> **${L.warning}** ${withEnding(sentence.text)}`);
    for (const sentence of examples) lines.push(`> **${L.example}** ${withEnding(sentence.text)}`);
    if (central) {
      lines.push(`> **${L.essential}** ${withEnding(withContext(central, sentences))}`);
    }
    selectedBySection.push({
      section,
      items: [central ?? opening[0], ...opening, ...supporting].filter(
        (item): item is Sentence => item !== undefined,
      ),
    });
    if (sections.length > 8) await tick();
  }

  // Partes de estudo (linha do tempo, perguntas, dados e termos) entram só até o texto do resumo
  // chegar a 70% do original: um resumo maior que o arquivo não resume nada.
  const coreWords = countWords(lines.join("\n"));
  const wordCap = wordsIn * DETAIL[detail].words;
  let remaining = Math.max(0, wordCap - coreWords);
  const takeWords = (fraction: number) => Math.min(remaining, Math.max(0, remaining * fraction));

  const questionLimit =
    detail === "short" ? 3 : tiny ? 2 : Math.min(20, Math.max(4, sections.length + 3));
  const questions: { question: string; answer: string }[] = [];
  {
    const seen = new Set<string>();
    const budget = takeWords(0.55);
    let spent = 0;
    const push = (question: string, answer: string) => {
      if (seen.has(question) || questions.length >= questionLimit) return;
      const cost = countWords(question) + countWords(answer) + 2;
      if (spent + cost > budget) return;
      seen.add(question);
      questions.push({ question, answer });
      spent += cost;
    };
    for (const sentence of [...definitionsSeen].sort((a, b) => b.score - a.score)) {
      if (sentence.definition)
        push(definitionQuestion(sentence.definition, doc.language), sentence.text);
    }
    for (const sentence of timeline.slice(0, 4)) {
      push(whenQuestion(yearOf(sentence)!.label, doc.language), sentence.text);
    }
    if (sections.length >= 3) {
      for (const entry of selectedBySection) {
        const central = entry.items[0];
        if (central) {
          push(L.centralQuestion(plainTitle(entry.section.title)), withContext(central, sentences));
        }
      }
    }
    if (questions.length < 2) questions.length = 0;
    else remaining -= spent;
  }

  const numeric: Sentence[] = [];
  {
    const budget = takeWords(0.6);
    let spent = 0;
    const pool = sentences
      .filter(
        (sentence) => standalone(sentence) && hasQuantity(sentence.text) && !used.has(sentence.id),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(10, Math.max(3, sections.length + 2)));
    for (const sentence of pool) {
      const cost = countWords(sentence.text) + 1;
      if (spent + cost > budget) continue;
      numeric.push(sentence);
      spent += cost;
    }
    if (numeric.length < 2 || detail === "short") numeric.length = 0;
    numeric.sort((a, b) => a.id - b.id);
    remaining -= spent;
  }

  const terms = keyTerms(
    sentences.map((sentence) => sentence.text),
    language,
    Math.min(18, Math.max(6, sections.length * 2)),
  );

  if (timeline.length >= 3) {
    lines.push(`## ${L.timeline}`);
    lines.push(`| ${L.when} | ${L.whatHappened} |`);
    lines.push("| --- | --- |");
    for (const sentence of timeline) {
      lines.push(
        `| ${yearOf(sentence)!.label} | ${withEnding(sentence.text).replace(/\|/g, "/")} |`,
      );
    }
  }
  if (numeric.length >= 2) {
    lines.push(`## ${L.numbers}`);
    for (const sentence of numeric) {
      used.add(sentence.id);
      lines.push(`- ${withEnding(sentence.text)}`);
    }
  }
  if (terms.length >= 3 && !tiny) {
    lines.push(`## ${L.terms}`);
    lines.push(terms.map((term) => `**${term.term}**`).join(", "));
  }
  if (questions.length >= 2) {
    lines.push(`## ${L.review}`);
    questions.forEach((item, index) => {
      lines.push(`**${L.question} ${index + 1}:** ${item.question}`);
      lines.push(`**${L.answer}:** ${withEnding(item.answer)}`);
    });
  }

  const body = lines.join("\n");
  const wordsOut = countWords(body);
  const selectedSentences = used.size;
  const selectedWords = sentences.reduce(
    (sum, sentence) => (used.has(sentence.id) ? sum + countWords(sentence.text) : sum),
    0,
  );
  const ratio = wordsIn > 0 ? selectedWords / wordsIn : 0;
  lines.push(`> **${L.aboutTitle}** ${L.about(selectedSentences, sentences.length)}`);
  progress(1, "composing");
  return {
    title,
    markdown: lines.join("\n"),
    stats: {
      pages: doc.pages,
      sections: sections.length,
      sentences: sentences.length,
      selectedSentences,
      wordsIn,
      wordsOut,
      ratio,
    },
  };
}

/** Frente: uma afirmação. Verso: "Verdadeiro." ou "Falso." e a frase do arquivo que explica. */
export type AutoFlashcard = { front: string; back: string; page: number; kind: CardOrigin };

/** Teto de cartões por arquivo: o baralho precisa continuar revisável. */
export const MAX_AUTO_FLASHCARDS = 200;

const TRUE_LABEL = { pt: "Verdadeiro.", en: "True." } as const;
const FALSE_LABEL = { pt: "Falso. O texto diz:", en: "False. The text says:" } as const;

function definitionParts(definition: Definition): DefinitionParts | undefined {
  const text = definition.sentence;
  if (text.startsWith(definition.term + ":"))
    return {
      term: definition.term,
      verb: "é",
      rest: text.slice(definition.term.length + 1).trim(),
    };
  const at = text.toLowerCase().indexOf(definition.verb.toLowerCase(), definition.term.length);
  if (at < 0) return undefined;
  const rest = text.slice(at + definition.verb.length).trim();
  return rest ? { term: definition.term, verb: definition.verb, rest } : undefined;
}

const squash = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * Flashcards automáticos de verdadeiro ou falso, feitos no aparelho e sem IA. Metade das frases
 * importantes do arquivo vira cartão verdadeiro, do jeito que está no texto. A outra metade vira
 * uma afirmação falsa: um número, uma negação, um antônimo, um termo ou a definição trocados. O
 * verso diz se é verdadeiro ou falso e mostra a frase do arquivo, então nada é inventado como
 * fato. Sempre o máximo que o texto sustenta.
 */
export async function flashcardsFromDocument(
  doc: StructuredDocument,
  options: Pick<SummaryOptions, "signal"> = {},
): Promise<AutoFlashcard[]> {
  const exam = parseExam(doc);
  if (isExam(exam)) {
    const problem = examProblem(exam);
    if (problem) throw problem;
    return examFlashcards(exam).slice(0, MAX_AUTO_FLASHCARDS);
  }
  const prepared = prepare(doc);
  const { sections, sentences, language } = prepared;
  for (let index = 0; index < sections.length; index += 1) {
    options.signal?.throwIfAborted();
    scoreSection(prepared, sections[index]!);
    if (index % 4 === 3) await tick();
  }
  const known = new Set(sentences.map((sentence) => squash(sentence.text)));
  const candidates = sentences
    .filter(
      (sentence) =>
        sentence.candidate &&
        !dependsOnPrevious(sentence.text) &&
        !isReferenceLike(sentence.text) &&
        sentence.text.length <= 260 &&
        looksLikeStatement(sentence.text, language),
    )
    .sort((x, y) => y.score - x.score)
    .slice(0, MAX_AUTO_FLASHCARDS);
  const numbers = [...new Set(sentences.flatMap((sentence) => numbersIn(sentence.text)))];
  const definitions = sentences
    .map((sentence) => (sentence.definition ? definitionParts(sentence.definition) : undefined))
    .filter((item): item is DefinitionParts => item !== undefined);
  const made: { id: number; card: AutoFlashcard }[] = [];
  const fronts = new Set<string>();
  let falses = 0;
  let trues = 0;
  for (const sentence of candidates) {
    const own = sentence.definition ? definitionParts(sentence.definition) : undefined;
    const wrong =
      falses <= trues
        ? falseVariant(sentence.text, {
            index: sentence.id,
            language,
            numbers,
            definitions,
            ...(own ? { own } : {}),
          })
        : undefined;
    const usable =
      wrong &&
      !known.has(squash(wrong.text)) &&
      wrong.text.length <= 300 &&
      looksLikeStatement(wrong.text, language)
        ? wrong
        : undefined;
    const front = usable?.text ?? sentence.text;
    if (fronts.has(front)) continue;
    fronts.add(front);
    const back = usable
      ? `${FALSE_LABEL[language]} ${sentence.text}`
      : `${TRUE_LABEL[language]} ${sentence.text}`;
    if (usable) falses += 1;
    else trues += 1;
    made.push({
      id: sentence.id,
      card: { front, back, page: sentence.page, kind: usable ? usable.kind : "true" },
    });
  }
  return made.sort((x, y) => x.id - y.id).map(({ card }) => card);
}

/** Frase do arquivo com o que o gerador de quiz precisa saber dela. */
export type Fact = {
  id: number;
  text: string;
  page: number;
  score: number;
  /** Anos de quatro dígitos citados na frase. */
  years: string[];
  definition?: { term: string; verb: string; plural: boolean; rest: string };
};

/** Frases importantes e autossuficientes do documento, com definição e anos já identificados. */
export async function extractFacts(
  doc: StructuredDocument,
  options: Pick<SummaryOptions, "signal"> = {},
): Promise<{ language: Language; facts: Fact[] }> {
  const prepared = prepare(doc);
  const { sections, sentences, language } = prepared;
  for (let index = 0; index < sections.length; index += 1) {
    options.signal?.throwIfAborted();
    scoreSection(prepared, sections[index]!);
    if (index % 4 === 3) await tick();
  }
  const facts: Fact[] = sentences
    .filter(
      (sentence) =>
        sentence.candidate &&
        !dependsOnPrevious(sentence.text) &&
        !isReferenceLike(sentence.text) &&
        sentence.text.length <= 320 &&
        looksLikeStatement(sentence.text, language),
    )
    .map((sentence) => {
      const parts = sentence.definition ? definitionParts(sentence.definition) : undefined;
      return {
        id: sentence.id,
        text: sentence.text,
        page: sentence.page,
        score: sentence.score,
        years: sentence.dates.map((date) => date.label).filter((label) => /^\d{4}$/.test(label)),
        ...(parts && sentence.definition
          ? {
              definition: {
                term: parts.term,
                verb: parts.verb,
                plural: sentence.definition.plural,
                rest: parts.rest,
              },
            }
          : {}),
      };
    });
  return { language, facts };
}
