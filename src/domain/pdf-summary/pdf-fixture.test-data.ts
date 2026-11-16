import type { Fixture } from "./fixtures.test-data";

// Gera PDFs de verdade (bytes) a partir dos textos de teste, para passar pelo leitor real (pdf.js).
// Sem dependências: fontes padrão do PDF, codificação WinAnsi e páginas A4.

export type PdfLayoutOptions = {
  columns?: 1 | 2;
  header?: string;
  footerNumbers?: boolean;
  /** Parte palavras compridas no fim da linha com hífen, como um editor de texto faz. */
  hyphenate?: boolean;
  bodySize?: number;
  /** Texto repetido em cada página, no pé ("Apostila 2026 - página 1"). */
  footerText?: string;
};

type Drawn = { font: "F1" | "F2"; size: number; x: number; y: number; text: string };
type Page = Drawn[];

const WIDTH = 595;
const HEIGHT = 842;
const MARGIN = 72;
const HEADING_SIZES: Record<1 | 2 | 3, number> = { 1: 20, 2: 16, 3: 13 };

function escapePdf(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (char === "(" || char === ")" || char === "\\") out += `\\${char}`;
    else if (code > 127) out += `\\${(code < 256 ? code : 63).toString(8).padStart(3, "0")}`;
    else out += char;
  }
  return out;
}

function charWidth(size: number): number {
  return size * 0.5;
}

function wrap(text: string, maxWidth: number, size: number, hyphenate: boolean): string[] {
  const lines: string[] = [];
  let line = "";
  const limit = Math.floor(maxWidth / charWidth(size));
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= limit) {
      line = candidate;
      continue;
    }
    if (hyphenate && word.length >= 9) {
      const room = limit - line.length - 2;
      if (room >= 4 && word.length - room >= 3) {
        lines.push(`${line} ${word.slice(0, room)}-`.trim());
        line = word.slice(room);
        continue;
      }
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

export function layoutFixture(fixture: Fixture, options: PdfLayoutOptions = {}): Page[] {
  const columns = options.columns ?? 1;
  const body = options.bodySize ?? 11;
  const leading = body * 1.3;
  const gap = 24;
  const columnWidth = (WIDTH - 2 * MARGIN - (columns - 1) * gap) / columns;
  const top = HEIGHT - MARGIN - 20;
  const bottom = MARGIN + 10;
  const pages: Page[] = [[]];
  let column = 0;
  let y = top;
  const decorate = (page: Page, number: number) => {
    if (options.header)
      page.push({ font: "F2", size: 9, x: MARGIN, y: HEIGHT - 32, text: options.header });
    if (options.footerNumbers !== false) {
      page.push({ font: "F1", size: 9, x: WIDTH / 2, y: 36, text: String(number) });
    }
    if (options.footerText) {
      page.push({
        font: "F1",
        size: 8,
        x: MARGIN,
        y: 24,
        text: `${options.footerText} - página ${number}`,
      });
    }
  };
  const nextColumn = () => {
    column += 1;
    if (column >= columns) {
      pages.push([]);
      column = 0;
    }
    y = top;
  };
  const place = (text: string, font: "F1" | "F2", size: number) => {
    if (y - leading < bottom) nextColumn();
    pages[pages.length - 1]!.push({
      font,
      size,
      x: MARGIN + column * (columnWidth + gap),
      y,
      text,
    });
    y -= size === body ? leading : size * 1.3;
  };
  if (fixture.title && columns === 1) {
    for (const line of wrap(fixture.title, columnWidth, 26, false)) place(line, "F2", 26);
    y -= 14;
  }
  for (const block of fixture.blocks) {
    if (block.kind === "heading") {
      const size = HEADING_SIZES[block.level];
      if (y - size * 3 < bottom) nextColumn();
      y -= 14;
      for (const line of wrap(block.text, columnWidth, size, false)) place(line, "F2", size);
      y -= 6;
    } else if (block.kind === "table") {
      const cell = columnWidth / block.rows[0]!.length;
      for (const row of block.rows) {
        if (y - leading < bottom) nextColumn();
        row.forEach((text, index) => {
          pages[pages.length - 1]!.push({
            font: row === block.rows[0] ? "F2" : "F1",
            size: body,
            x: MARGIN + column * (columnWidth + gap) + index * cell,
            y,
            text,
          });
        });
        y -= leading;
      }
      y -= 10;
    } else {
      for (const line of wrap(block.text, columnWidth, body, options.hyphenate ?? false)) {
        place(line, "F1", body);
      }
      y -= 10;
    }
  }
  pages.forEach((page, index) => decorate(page, index + 1));
  return pages;
}

export function buildPdf(pages: Page[]): Uint8Array {
  const objects: string[] = [];
  const add = (body: string) => objects.push(body) && objects.length;
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("");
  const f1 = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const f2 = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );
  const kids: number[] = [];
  for (const page of pages) {
    const stream = page
      .map(
        (item) =>
          `BT /${item.font} ${item.size} Tf ${item.x.toFixed(2)} ${item.y.toFixed(2)} Td (${escapePdf(item.text)}) Tj ET`,
      )
      .join("\n");
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    kids.push(
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${WIDTH} ${HEIGHT}] /Contents ${content} 0 R /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> >>`,
      ),
    );
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.map((id) => `${id} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(out.length);
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(out.length);
  for (let index = 0; index < out.length; index += 1) bytes[index] = out.charCodeAt(index) & 255;
  return bytes;
}

export function fixturePdf(fixture: Fixture, options: PdfLayoutOptions = {}): Uint8Array {
  return buildPdf(layoutFixture(fixture, options));
}
