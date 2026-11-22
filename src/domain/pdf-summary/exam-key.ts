import type { KeySection } from "./exam";

// Gabarito em linhas de resposta: "1-B 2-C", "001 - E 010 - E", "1 C 26 A" (duas colunas) e
// "1 a 10 – CONHECIMENTOS GERAIS 25 A". Um arquivo pode ter vários gabaritos (um por prova, tipo ou
// versão), cada um com o seu título; o título serve para casar o gabarito com a prova certa.

const LETTERS = "ABCDE";
const HEADING_WORDS =
  /^\s*(?:gabarito(?:\s+(?:oficial|preliminar|definitivo))?|respostas?|chave\s+de\s+corre[çc][ãa]o|answer\s+key)\b[:\s-]*/i;
const PAIR = /(?:quest[ãa]o\s*)?(\d{1,3})\s*([-–:.)]?)\s*([A-Ea-e])(?![\p{L}\d])/gu;
const SECTION_HEADER = /^quest[ãa]o\s+alternativa(?:\s+quest[ãa]o\s+alternativa)*$/i;
const RANGE_ROW = /^\d{1,3}\s+a\s+\d{1,3}\s*[-–]\s*.+?\s+(\d{1,3})\s+([A-E])$/i;

type Pair = [number, number];

function pairsOf(text: string): Pair[] | undefined {
  const body = text.replace(HEADING_WORDS, "").trim();
  if (!body) return undefined;
  const range = RANGE_ROW.exec(body);
  if (range) return [[Number(range[1]), LETTERS.indexOf(range[2]!.toUpperCase())]];
  // a linha inteira precisa ser feita de pares, senão é texto comum
  const pairs: Pair[] = [];
  let covered = 0;
  for (const match of body.matchAll(PAIR)) {
    const letter = match[3]!;
    const separated = match[2] !== "" || /^quest/i.test(match[0]);
    if (!separated && letter !== letter.toUpperCase()) return undefined;
    pairs.push([Number(match[1]), LETTERS.indexOf(letter.toUpperCase())]);
    covered += match[0].length;
  }
  const rest = body.replace(PAIR, "").replace(/[\s,;|]+/g, "");
  if (pairs.length === 0 || rest.length > 0 || covered === 0) return undefined;
  return pairs;
}

/** Procura gabaritos nas linhas. Devolve as seções achadas e quais linhas foram usadas por elas. */
export function readKeyLines(lines: readonly { text: string }[]): {
  sections: KeySection[];
  consumed: Set<number>;
} {
  const sections: KeySection[] = [];
  const consumed = new Set<number>();
  let title = "";
  const titleParts: string[] = [];
  let current: { title: string; key: Record<number, number>; rows: number[] } | undefined;
  const close = () => {
    if (current && Object.keys(current.key).length >= 5) {
      sections.push({ title: current.title, key: current.key });
      for (const index of current.rows) consumed.add(index);
    }
    current = undefined;
  };
  lines.forEach((line, index) => {
    const text = line.text.trim();
    if (SECTION_HEADER.test(text)) {
      close();
      current = { title, key: {}, rows: [index] };
      return;
    }
    const pairs = pairsOf(text);
    if (!pairs) {
      // "11 a 50 – CONHECIMENTOS ESPECÍFICOS" é só um rótulo de faixa dentro da tabela
      if (/^\d{1,3}\s+a\s+\d{1,3}\s*[-–]/i.test(text)) return;
      // texto comum: fecha o gabarito aberto e pode ser o título do próximo
      if (current && Object.keys(current.key).length > 0) close();
      // marca d'água de site ("pcimarkpci MDAw...=", "www...") não é título
      const watermark = /\S{25,}|=|www\./i.test(text);
      if (text.length >= 4 && !watermark) {
        titleParts.push(text);
        title = titleParts.slice(-2).join(" ");
      }
      return;
    }
    titleParts.length = 0;
    if (current && pairs.some(([number]) => number === 1 && current!.key[1] !== undefined)) close();
    if (!current) current = { title, key: {}, rows: [] };
    for (const [number, letter] of pairs)
      if (current.key[number] === undefined) current.key[number] = letter;
    current.rows.push(index);
  });
  close();
  return { sections, consumed };
}

const STOP = new Set([
  "para",
  "cargo",
  "cargos",
  "prova",
  "concurso",
  "publico",
  "gabarito",
  "preliminar",
  "questao",
  "alternativa",
  "edital",
  "versao",
]);
const norm = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Palavras que identificam a prova, e pares como "tipo 1" ou "versão A" juntos num só termo. */
export function identifyingTokens(text: string): Set<string> {
  const flat = norm(text);
  const tokens = new Set<string>();
  for (const match of flat.matchAll(
    /\b(tipo|versao|modelo|caderno|cor)\s*[-:]?\s*([a-z0-9]{1,3})\b/g,
  ))
    tokens.add(`${match[1]}${match[2]}`);
  for (const word of flat.match(/\b[a-z0-9]{3,20}\b/g) ?? []) if (!STOP.has(word)) tokens.add(word);
  return tokens;
}

/**
 * Escolhe o gabarito de uma prova entre vários, pelo que o título dele tem em comum com o começo da
 * prova. Sem empate e com pelo menos 2 termos em comum. Com um gabarito só, usa esse.
 */
export function pickKeySection(
  head: string,
  all: readonly KeySection[],
  wanted: readonly number[] = [],
): KeySection | undefined {
  // Gabarito que não cobre quase todas as questões da prova (tabela quebrada em colunas) não serve.
  const sections = wanted.length
    ? all.filter(
        (section) =>
          wanted.filter((number) => section.key[number] !== undefined).length >=
          wanted.length * 0.8,
      )
    : all;
  if (sections.length === 0) return undefined;
  if (all.length === 1) return sections[0];
  const mine = identifyingTokens(head);
  const titles = all.map((section) => identifyingTokens(section.title));
  // O que é comum a todos os títulos (concurso, cargo geral) não distingue um gabarito do outro.
  const common = new Set([...titles[0]!].filter((token) => titles.every((set) => set.has(token))));
  const scored = sections
    .map((section) => {
      const theirs = identifyingTokens(section.title);
      let score = 0;
      for (const token of theirs) {
        if (common.has(token)) continue;
        // Todo termo que distingue este gabarito (cargo, tipo, versão) precisa estar na prova.
        if (!mine.has(token)) return { section, score: -1 };
        score += /^(tipo|versao|modelo|caderno|cor)/.test(token) ? 3 : 1;
      }
      return { section, score };
    })
    .sort((a, b) => b.score - a.score);
  const [best, next] = scored;
  if (!best || best.score < 2 || (next && next.score === best.score)) return undefined;
  return best.section;
}
