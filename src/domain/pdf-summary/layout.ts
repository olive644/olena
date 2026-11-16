import { detectLanguage } from "./portuguese";
import type {
  DocumentBlock,
  PdfPageText,
  PdfTextItem,
  StructuredDocument,
  TextLine,
} from "./types";

// Do que o leitor de PDF entrega (pedaços de texto com posição e tamanho) até um documento com
// títulos e parágrafos: linhas, colunas, cabeçalho e rodapé, títulos, parágrafos e hifenização.

const PAGE_NUMBER = /^(?:p(?:[áa]g(?:ina)?)?\.?\s*)?\d{1,4}(?:\s*(?:de|\/|-)\s*\d{1,4})?$/i;
const BULLET = /^(?:[•▪◦·●○■*]|[-\u2013\u2014]\s|\d{1,2}[.)]\s|[a-zA-Z][.)]\s)/;
const CHAPTER =
  /^(?:cap[ií]tulo|se[cç][aã]o|unidade|parte|aula|m[óo]dulo|chapter|section|unit|part|lesson)\s+(?:\d+|[IVXLC]+)\b/i;
const NUMBERED =
  /^((?:\d{1,2}(?:\.\d{1,2})+)|(?:\d{1,2}[.)])|(?:[IVXLC]{1,6}[.)])|(?:[A-Z][.)]))\s+\p{L}/u;
const REFERENCES =
  /^(?:refer[êe]ncias(?:\s+bibliogr[áa]ficas)?|bibliografia|references|bibliography|sum[áa]rio|[íi]ndice|contents|table of contents)$/i;
const CAPTION =
  /^(?:figura|fig\.|tabela|quadro|gr[áa]fico|fonte|figure|table|chart|source)\s*\d*\s*[:.\-\u2013]/i;

function round(value: number, step = 0.5): number {
  return Math.round(value / step) * step;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function joinItems(items: PdfTextItem[]): { text: string; x: number; right: number } {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let text = "";
  let right = Number.NEGATIVE_INFINITY;
  for (const item of sorted) {
    if (text && right > Number.NEGATIVE_INFINITY) {
      const gap = item.x - right;
      const needsSpace = gap > item.size * 0.22 && !/\s$/.test(text) && !/^\s/.test(item.text);
      if (needsSpace) text += " ";
    }
    text += item.text;
    right = Math.max(right, item.x + item.width);
  }
  const first = sorted[0];
  return { text: text.replace(/­/g, ""), x: first ? first.x : 0, right };
}

function groupIntoLines(items: PdfTextItem[], page: PdfPageText): TextLine[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const groups: PdfTextItem[][] = [];
  let current: PdfTextItem[] = [];
  let currentY = 0;
  for (const item of sorted) {
    const tolerance = Math.max(item.size, 1) * 0.45;
    if (current.length === 0 || Math.abs(item.y - currentY) <= tolerance) {
      if (current.length === 0) currentY = item.y;
      current.push(item);
    } else {
      groups.push(current);
      current = [item];
      currentY = item.y;
    }
  }
  if (current.length) groups.push(current);
  const lines: TextLine[] = [];
  for (const group of groups) {
    const joined = joinItems(group);
    const text = joined.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const dominant = group.reduce((best, item) =>
      item.text.length > best.text.length ? item : best,
    );
    lines.push({
      page: page.page,
      x: joined.x,
      right: joined.right,
      y: group.reduce((total, item) => total + item.y, 0) / group.length,
      size: dominant.size,
      font: dominant.font,
      text,
      pageHeight: page.height,
    });
  }
  return lines;
}

/** Procura o vão entre duas colunas e devolve o ponto médio dele, ou undefined se há uma coluna. */
function findGutter(items: readonly PdfTextItem[], pageWidth: number): number | undefined {
  if (items.length < 12 || pageWidth <= 0) return undefined;
  const bin = 2;
  const bins = Math.ceil(pageWidth / bin);
  const counts = new Array<number>(bins).fill(0);
  for (const item of items) {
    if (item.width <= 0) continue;
    const from = Math.max(0, Math.floor(item.x / bin));
    const to = Math.min(bins - 1, Math.floor((item.x + item.width) / bin));
    for (let index = from; index <= to; index += 1) counts[index] = counts[index]! + 1;
  }
  const limit = Math.max(2, Math.floor(items.length * 0.03));
  const lo = Math.floor(bins * 0.3);
  const hi = Math.ceil(bins * 0.7);
  let bestStart = -1;
  let bestLength = 0;
  let runStart = -1;
  for (let index = lo; index <= hi; index += 1) {
    const empty = index < hi && counts[index]! <= limit;
    if (empty && runStart < 0) runStart = index;
    if (!empty && runStart >= 0) {
      const length = index - runStart;
      if (length > bestLength) {
        bestLength = length;
        bestStart = runStart;
      }
      runStart = -1;
    }
  }
  if (bestLength * bin < 10) return undefined;
  return (bestStart + bestLength / 2) * bin;
}

/** Linhas de uma página na ordem de leitura, tratando duas colunas. */
export function layoutPage(page: PdfPageText): TextLine[] {
  const items = page.items.filter((item) => item.text.trim() !== "" && item.size > 0);
  const gutter = findGutter(items, page.width);
  if (gutter === undefined) return groupIntoLines(items, page);
  const left: PdfTextItem[] = [];
  const right: PdfTextItem[] = [];
  const across: PdfTextItem[] = [];
  for (const item of items) {
    const end = item.x + item.width;
    if (item.x < gutter - 4 && end > gutter + 4) across.push(item);
    else if (item.x + item.width / 2 < gutter) left.push(item);
    else right.push(item);
  }
  const leftLines = groupIntoLines(left, page);
  const rightLines = groupIntoLines(right, page);
  const total = leftLines.length + rightLines.length;
  if (
    leftLines.length < 6 ||
    rightLines.length < 6 ||
    Math.min(leftLines.length, rightLines.length) < total * 0.25
  ) {
    return groupIntoLines(items, page);
  }
  const acrossLines = groupIntoLines(across, page);
  const columnTop = Math.max(leftLines[0]!.y, rightLines[0]!.y);
  const before = acrossLines.filter((line) => line.y >= columnTop - 1);
  const after = acrossLines.filter((line) => line.y < columnTop - 1);
  return [...before, ...leftLines, ...rightLines, ...after];
}

function lineKey(line: TextLine): string {
  return line.text.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
}

function inBorder(line: TextLine): "top" | "bottom" | undefined {
  if (line.y > line.pageHeight * 0.92) return "top";
  if (line.y < line.pageHeight * 0.08) return "bottom";
  return undefined;
}

/** Tira cabeçalhos, rodapés e números de página (o que se repete nas bordas das páginas). */
function removeRunningText(pages: TextLine[][]): TextLine[][] {
  const counts = new Map<string, Set<number>>();
  for (const lines of pages) {
    for (const line of lines) {
      const border = inBorder(line);
      if (!border) continue;
      const key = `${border}|${lineKey(line)}`;
      const set = counts.get(key) ?? new Set<number>();
      set.add(line.page);
      counts.set(key, set);
    }
  }
  const total = pages.length;
  const needed = total >= 3 ? Math.max(3, Math.ceil(total * 0.4)) : total;
  return pages.map((lines) =>
    lines.filter((line) => {
      const border = inBorder(line);
      if (!border) return true;
      if (PAGE_NUMBER.test(line.text.trim())) return false;
      const seen = counts.get(`${border}|${lineKey(line)}`)?.size ?? 0;
      return !(total >= 2 && seen >= needed);
    }),
  );
}

function hasTerminalPunctuation(text: string): boolean {
  return /[.!?;…]["”')\]]?$/.test(text.trim());
}

type Classified = { line: TextLine; heading?: { depth: number; styled: boolean } };

function classify(lines: TextLine[]): { entries: Classified[]; bodySize: number } {
  const bySize = new Map<number, number>();
  const byFont = new Map<string, number>();
  for (const line of lines) {
    const size = round(line.size);
    bySize.set(size, (bySize.get(size) ?? 0) + line.text.length);
    byFont.set(line.font, (byFont.get(line.font) ?? 0) + line.text.length);
  }
  const bodySize = [...bySize.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;
  const bodyFont = [...byFont.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const lineHeights: number[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const a = lines[index - 1]!;
    const b = lines[index]!;
    if (a.page === b.page && a.y > b.y) lineHeights.push(a.y - b.y);
  }
  const typicalGap = median(lineHeights) || bodySize * 1.25;
  const entries: Classified[] = lines.map((line) => ({ line }));
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const text = line.text.trim();
    const wordCount = text.split(/\s+/).length;
    if (text.length > 140 || wordCount > 18 || (BULLET.test(text) && !NUMBERED.test(text)))
      continue;
    if (CAPTION.test(text)) continue;
    const previous = lines[index - 1];
    const next = lines[index + 1];
    const gapBefore =
      previous && previous.page === line.page ? previous.y - line.y : Number.POSITIVE_INFINITY;
    const gapAfter = next && next.page === line.page ? line.y - next.y : Number.POSITIVE_INFINITY;
    const bigger = round(line.size) >= bodySize * 1.18;
    const terminal = hasTerminalPunctuation(text);
    const numbered = NUMBERED.exec(text);
    const depth =
      numbered && /\./.test(numbered[1]!.replace(/\.$/, ""))
        ? numbered[1]!.replace(/\.$/, "").split(".").length
        : 1;
    const letters = text.replace(/[^\p{L}]/gu, "");
    const allCaps = letters.length >= 4 && text === text.toUpperCase() && wordCount <= 10;
    const styled = line.font !== bodyFont;
    const spaced = gapBefore > typicalGap * 1.35 || gapAfter > typicalGap * 1.35;
    let heading = false;
    if (bigger && !terminal) heading = true;
    else if (CHAPTER.test(text) && !terminal) heading = true;
    else if (
      numbered &&
      !terminal &&
      (styled || wordCount <= 8 || depth >= 2) &&
      round(line.size) >= bodySize * 0.95
    )
      heading = true;
    else if (allCaps && !terminal && spaced) heading = true;
    else if (
      styled &&
      !terminal &&
      wordCount <= 10 &&
      round(line.size) >= bodySize * 0.98 &&
      spaced &&
      !/[,]$/.test(text)
    )
      heading = true;
    if (heading) entries[index]!.heading = { depth, styled };
  }
  return { entries, bodySize };
}

function headingLevels(entries: Classified[]): Map<number, 1 | 2 | 3> {
  const sizes = [
    ...new Set(entries.filter((entry) => entry.heading).map((entry) => round(entry.line.size))),
  ].sort((a, b) => b - a);
  const levels = new Map<number, 1 | 2 | 3>();
  sizes.forEach((size, index) => levels.set(size, Math.min(index + 1, 3) as 1 | 2 | 3));
  return levels;
}

function cleanParagraph(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function joinLines(previous: string, next: string): string {
  if (/\p{L}-$/u.test(previous) && /^\p{Ll}/u.test(next)) return previous.slice(0, -1) + next;
  return `${previous} ${next}`;
}

function isNoise(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, "").length;
  if (text.length < 60 && letters / Math.max(text.length, 1) < 0.4) return true;
  if (/^\[\d+\]/.test(text)) return true;
  return false;
}

/** Monta títulos e parágrafos a partir das linhas (já em ordem de leitura, todas as páginas). */
export function assembleDocument(
  pageLines: TextLine[][],
  pages: number,
  fileTitle = "",
): StructuredDocument {
  const cleaned = removeRunningText(pageLines);
  const lines = cleaned.flat();
  const { entries, bodySize } = classify(lines);
  const levels = headingLevels(entries);
  const blocks: DocumentBlock[] = [];
  let paragraph:
    { text: string; page: number; lastY: number; lastX: number; lastSize: number } | undefined;
  let skipping = false;
  const flush = () => {
    if (!paragraph) return;
    const text = cleanParagraph(paragraph.text);
    if (text.split(/\s+/).length >= 3 && !isNoise(text)) {
      blocks.push({ kind: "paragraph", text, page: paragraph.page });
    }
    paragraph = undefined;
  };
  let index = 0;
  while (index < entries.length) {
    const entry = entries[index]!;
    const line = entry.line;
    if (entry.heading) {
      flush();
      let text = line.text.trim();
      const depth = entry.heading.depth;
      let end = index;
      while (end + 1 < entries.length) {
        const following = entries[end + 1]!;
        if (
          following.heading &&
          following.line.page === line.page &&
          round(following.line.size) === round(line.size) &&
          line.y - following.line.y < line.size * 1.9 &&
          !NUMBERED.test(following.line.text) &&
          text.length < 100
        ) {
          text = `${text} ${following.line.text.trim()}`;
          end += 1;
        } else break;
      }
      const sizeLevel = levels.get(round(line.size));
      const sameSizeEverywhere = levels.size <= 1;
      const level = (sameSizeEverywhere ? Math.min(depth, 3) : (sizeLevel ?? 1)) as 1 | 2 | 3;
      skipping = REFERENCES.test(text.replace(/[:.]+$/, "").trim());
      if (!skipping)
        blocks.push({ kind: "heading", level, text: cleanParagraph(text), page: line.page });
      index = end + 1;
      continue;
    }
    index += 1;
    if (skipping) continue;
    const text = line.text.trim();
    if (CAPTION.test(text) && text.length < 90) continue;
    const startsItem = BULLET.test(text);
    if (!paragraph) {
      paragraph = { text, page: line.page, lastY: line.y, lastX: line.x, lastSize: line.size };
      continue;
    }
    const samePage = line.page === paragraph.page || line.page === paragraph.page;
    const gap = paragraph.lastY - line.y;
    const bigGap =
      samePage &&
      gap > bodySize * 1.75 &&
      line.page === (blocks.length ? paragraph.page : line.page);
    const indented =
      line.x > paragraph.lastX + line.size * 1.2 && hasTerminalPunctuation(paragraph.text);
    const pageBreakEnds = line.page !== paragraph.page && hasTerminalPunctuation(paragraph.text);
    if (startsItem || bigGap || indented || pageBreakEnds) {
      flush();
      paragraph = { text, page: line.page, lastY: line.y, lastX: line.x, lastSize: line.size };
    } else {
      paragraph.text = joinLines(paragraph.text, text);
      paragraph.lastY = line.y;
      paragraph.lastX = line.x;
      paragraph.lastSize = line.size;
    }
  }
  flush();
  return finalizeDocument(blocks, pages, fileTitle);
}

/** Escolhe o título do arquivo e a língua, e retira o título da lista de seções. */
export function finalizeDocument(
  blocks: DocumentBlock[],
  pages: number,
  fileTitle: string,
): StructuredDocument {
  let title = fileTitle
    .replace(/\.[A-Za-z0-9]{1,5}$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
  let result = blocks;
  const first = blocks[0];
  const headings = blocks.filter((block) => block.kind === "heading");
  const topLevel = headings.filter((block) => block.level === 1);
  // Um único título de nível 1, no começo da primeira página, com outros títulos abaixo dele, é o
  // título do arquivo: sai da lista de seções e os demais sobem um nível.
  if (
    first &&
    first.kind === "heading" &&
    first.level === 1 &&
    first.page === 1 &&
    topLevel.length === 1 &&
    headings.length >= 3 &&
    !/^\d/.test(first.text)
  ) {
    title = first.text;
    result = blocks
      .slice(1)
      .map((block) =>
        block.kind === "heading"
          ? { ...block, level: Math.max(1, block.level - 1) as 1 | 2 | 3 }
          : block,
      );
  }
  const text = result.map((block) => block.text).join(" ");
  return {
    title: title || "Resumo",
    language: detectLanguage(text),
    pages,
    blocks: result,
    characters: result.reduce(
      (total, block) => total + (block.kind === "paragraph" ? block.text.length : 0),
      0,
    ),
  };
}

/** Atalho para testes: páginas completas até documento. */
export function buildDocument(pages: readonly PdfPageText[], fileTitle = ""): StructuredDocument {
  return assembleDocument(pages.map(layoutPage), pages.length, fileTitle);
}

/** Texto simples (TXT, Markdown, nota): parágrafos separados por linha em branco. */
export function structureText(text: string, fileTitle = ""): StructuredDocument {
  const blocks: DocumentBlock[] = [];
  const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  for (const raw of paragraphs) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const markdown = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    const firstLine = trimmed.split("\n")[0]!.trim();
    const wordCount = firstLine.split(/\s+/).length;
    if (markdown && !trimmed.includes("\n")) {
      blocks.push({
        kind: "heading",
        level: markdown[1]!.length as 1 | 2 | 3,
        text: markdown[2]!.trim(),
        page: 1,
      });
      continue;
    }
    if (
      !trimmed.includes("\n") &&
      wordCount <= 12 &&
      trimmed.length <= 100 &&
      !hasTerminalPunctuation(trimmed) &&
      (NUMBERED.test(trimmed) ||
        CHAPTER.test(trimmed) ||
        (trimmed === trimmed.toUpperCase() && /\p{L}{4}/u.test(trimmed)))
    ) {
      const depth = NUMBERED.exec(trimmed);
      const level =
        depth && /\./.test(depth[1]!.replace(/\.$/, ""))
          ? Math.min(depth[1]!.replace(/\.$/, "").split(".").length, 3)
          : 1;
      blocks.push({ kind: "heading", level: level as 1 | 2 | 3, text: trimmed, page: 1 });
      continue;
    }
    const joined = cleanParagraph(
      trimmed
        .split("\n")
        .reduce(
          (accumulator, part) => (accumulator ? joinLines(accumulator, part.trim()) : part.trim()),
          "",
        ),
    );
    if (joined.split(/\s+/).length >= 3) blocks.push({ kind: "paragraph", text: joined, page: 1 });
  }
  return finalizeDocument(blocks, 1, fileTitle);
}
