import type { StructuredDocument } from "./types";

// Leitor de prova: reconhece questões numeradas com alternativas (A, B, C...) e o gabarito, nos
// formatos comuns de prova de colégio, vestibular e concurso. Só lê o que está escrito: nunca
// adivinha a resposta. Questão sem gabarito conhecido fica sem `answer`.
//
// O leitor de PDF e o de texto juntam as linhas de um parágrafo, então "A) x B) y C) z" pode vir
// numa linha só. Por isso o texto é cortado pelos marcadores (questão, alternativa, gabarito) e não
// por quebras de linha.

export type ExamQuestion = {
  number: number;
  /** Texto de apoio que vem antes do enunciado (quando existe). */
  context: string;
  stem: string;
  options: string[];
  /** Índice da alternativa correta, se o gabarito do arquivo diz. */
  answer?: number;
  page: number;
  /** Depende de figura, gráfico ou tabela que o texto do PDF não traz. */
  needsFigure: boolean;
};

export type ParsedExam = {
  questions: ExamQuestion[];
  hasAnswerKey: boolean;
  /** Gabarito lido no arquivo: número da questão para índice da alternativa. */
  key: Record<number, number>;
  answered: number;
  figureQuestions: number;
};

const LETTERS = ["A", "B", "C", "D", "E"];
const MARKER =
  /(?<![\p{L}\p{N}])(?:(?<q>quest[ãa]o\s*(?:n[º°o.]*\s*)?(?<qn>\d{1,3})\s*[.)\-–:]?)|(?<n>(?<nn>\d{1,3})\s*[.)\-–]\s+(?=\p{Lu}))|(?<o>\(?(?<ol>[A-Ea-e])\)\s*)|(?<k>(?:gabarito|respostas?(?:\s+correta)?|alternativa\s+correta|chave\s+de\s+corre[çc][ãa]o|answer\s+key)(?![\p{L}])\s*[:\-–]?\s*))/giu;
const DOT_OPTION = /^([A-Ea-e])\.\s+(?=\S)/u;
const INLINE_ANSWER =
  /(?:gabarito|resposta(?:\s+correta)?|alternativa\s+correta)\s*[:\-–]\s*\(?([A-Ea-e])\)?(?![\p{L}])/iu;
const KEY_PAIR = /(?<![\d])(\d{1,3})\s*[-–.):]*\s*\(?([A-Ea-e])\)?(?![\p{L}\d])/gu;
const FIGURE =
  /(?:observe|analise|considere|veja|a partir d[aeo]s?|com base n[aeo]s?)\s+(?:a|o|as|os)?\s*(?:figura|gr[áa]fico|imagem|tabela|mapa|charge|tirinha|esquema|quadro)|\b(?:figura|gr[áa]fico|tirinha)\s*\d|(?:figure|chart|diagram)\s*\d/iu;

type Draft = {
  number: number;
  context: string;
  stem: string;
  options: string[];
  answer?: number;
  page: number;
};

const endsSentence = (text: string) => /[.?!;:]$/.test(text);
const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** Lê as questões e o gabarito de um documento. Não decide se é uma prova: veja `isExam`. */
export function parseExam(doc: StructuredDocument): ParsedExam {
  const drafts: Draft[] = [];
  const key = new Map<number, number>();
  let current: Draft | undefined;
  let lastNumber = 0;
  let support = "";
  let inKey = false;
  let keyNumber: number | undefined;
  /** Lê pares "número letra" do gabarito, inclusive quando o número já veio como marcador. */
  function readKey(piece: string) {
    if (keyNumber !== undefined) {
      const lead = /^\s*[:\-–.)]*\s*\(?([A-Ea-e])\)?(?![\p{L}\d])/u.exec(piece);
      if (lead && !key.has(keyNumber)) key.set(keyNumber, LETTERS.indexOf(lead[1]!.toUpperCase()));
      keyNumber = undefined;
    }
    for (const pair of piece.matchAll(KEY_PAIR)) {
      const letter = LETTERS.indexOf(pair[2]!.toUpperCase());
      if (letter >= 0 && !key.has(Number(pair[1]))) key.set(Number(pair[1]), letter);
    }
  }

  /** Texto solto: continua o enunciado, a última alternativa ou vira apoio da próxima questão. */
  function continueWith(text: string, startOfBlock: boolean) {
    const piece = clean(text);
    if (!piece || !current) return;
    const inline = INLINE_ANSWER.exec(piece);
    if (inline) {
      current.answer = LETTERS.indexOf(inline[1]!.toUpperCase());
      const rest = clean(piece.replace(INLINE_ANSWER, ""));
      if (!rest) return;
      return continueWith(rest, startOfBlock);
    }
    if (current.options.length === 0) {
      current.stem = clean(`${current.stem} ${piece}`);
      return;
    }
    const last = current.options.length - 1;
    const previous = current.options[last]!;
    const looksLikeSupport =
      startOfBlock &&
      current.options.length >= 3 &&
      endsSentence(previous) &&
      /^\p{Lu}/u.test(piece) &&
      piece.length > 60;
    if (looksLikeSupport) support = clean(`${support} ${piece}`);
    else current.options[last] = clean(`${previous} ${piece}`);
  }

  for (const block of doc.blocks) {
    const text = block.text;
    const markers = [...text.matchAll(MARKER)];
    const dot = DOT_OPTION.exec(text.trimStart());
    let cursor = 0;
    const pending: { index: number; end: number; kind: string; value: string }[] = [];
    if (dot && !markers.some((m) => m.index === 0 && m.groups?.["o"])) {
      const at = text.indexOf(dot[0]);
      pending.push({ index: at, end: at + dot[0].length, kind: "o", value: dot[1]! });
    }
    for (const m of markers) {
      const g = m.groups!;
      const kind = g["q"] ? "q" : g["n"] ? "n" : g["o"] ? "o" : "k";
      const value = g["qn"] ?? g["nn"] ?? g["ol"] ?? "";
      pending.push({ index: m.index!, end: m.index! + m[0].length, kind, value });
    }
    pending.sort((a, b) => a.index - b.index);

    let first = true;
    const flush = (until: number, startOfBlock: boolean) => {
      const piece = text.slice(cursor, until);
      if (inKey) readKey(piece);
      else continueWith(piece, startOfBlock);
    };
    for (const item of pending) {
      if (item.index < cursor) continue;
      flush(item.index, first);
      first = false;
      cursor = item.end;
      if (item.kind === "k") {
        const marker = text.slice(item.index, item.end);
        const hasSeparator = /[:\-–]\s*$/.test(marker);
        const heading = /^(?:gabarito|respostas?|chave|answer)/i.test(marker);
        const after = text.slice(item.end);
        // "Gabarito: B" dentro da questão é a resposta dela, não o começo do gabarito geral.
        const inlineLetter = /^\s*\(?([A-Ea-e])\)?(?![\p{L}\d])/u.exec(after);
        const wholeKey = /^\s*\d/.test(after);
        if (current && inlineLetter && !wholeKey && hasSeparator) {
          current.answer = LETTERS.indexOf(inlineLetter[1]!.toUpperCase());
          cursor = item.end + inlineLetter[0].length;
        } else if (heading && (wholeKey || drafts.length >= 3 || /^\s*$/.test(after.slice(0, 3)))) {
          if (current) {
            drafts.push(current);
            current = undefined;
          }
          inKey = true;
        } else {
          // "a alternativa correta" no meio do enunciado é texto comum
          cursor = item.index;
        }
        continue;
      }
      if (inKey) {
        // "Questão 3: B" no gabarito: o número é o marcador e a letra vem logo depois
        if (item.kind === "q" || item.kind === "n") keyNumber = Number(item.value);
        continue;
      }
      if (item.kind === "q" || item.kind === "n") {
        const number = Number(item.value);
        // "1. item" (minúscula) é lista, e só "1. Item" abre questão
        const capital = item.kind === "q" || /^\p{Lu}/u.test(text.charAt(item.end));
        const accepts =
          capital &&
          number >= 1 &&
          (lastNumber === 0 ? number <= 3 : number > lastNumber && number <= lastNumber + 3);
        if (accepts) {
          if (current) drafts.push(current);
          lastNumber = number;
          current = {
            number,
            context: support,
            stem: "",
            options: [],
            page: block.page,
          };
          support = "";
        } else {
          // Número de lista dentro do enunciado ou da alternativa: é texto.
          cursor = item.index;
        }
        continue;
      }
      // alternativa: só a próxima letra esperada
      const expected = LETTERS[current?.options.length ?? 0];
      if (current && item.value.toUpperCase() === expected) current.options.push("");
      else cursor = item.index;
    }
    // resto do bloco
    const tail = text.slice(cursor);
    if (inKey) {
      readKey(tail);
    } else if (current) {
      if (current.options.length === 0 && pending.length === 0) continueWith(tail, true);
      else continueWith(tail, first);
    }
  }
  if (current) drafts.push(current);

  const questions: ExamQuestion[] = drafts
    .filter((draft) => draft.options.filter(Boolean).length >= 3 && draft.stem.length >= 8)
    .map((draft) => {
      const keyed = key.get(draft.number);
      const answer = draft.answer ?? keyed;
      const options = draft.options.map(clean);
      return {
        number: draft.number,
        context: draft.context,
        stem: draft.stem,
        options,
        ...(answer !== undefined && answer < options.length ? { answer } : {}),
        page: draft.page,
        needsFigure: FIGURE.test(`${draft.context} ${draft.stem}`),
      };
    });
  const answered = questions.filter((question) => question.answer !== undefined).length;
  return {
    questions,
    hasAnswerKey: key.size > 0 || answered > 0,
    key: Object.fromEntries(key),
    answered,
    figureQuestions: questions.filter((question) => question.needsFigure).length,
  };
}

/**
 * Aplica um gabarito (número da questão para índice da alternativa) às questões que ainda não têm
 * resposta. Serve para a prova e o gabarito que vêm em arquivos separados.
 */
export function applyAnswerKey(parsed: ParsedExam, key: Record<number, number>): ParsedExam {
  const questions = parsed.questions.map((question) => {
    const index = key[question.number];
    if (question.answer !== undefined || index === undefined || index >= question.options.length)
      return question;
    return { ...question, answer: index };
  });
  return {
    ...parsed,
    questions,
    hasAnswerKey: parsed.hasAnswerKey || Object.keys(key).length > 0,
    key: { ...key, ...parsed.key },
    answered: questions.filter((question) => question.answer !== undefined).length,
  };
}

/** O documento é uma prova? Várias questões com alternativas. */
export function isExam(parsed: ParsedExam): boolean {
  return parsed.questions.length >= 4;
}

/** Questões que dão para estudar: têm gabarito e não dependem de figura que o PDF não traz. */
export function studyableQuestions(parsed: ParsedExam): ExamQuestion[] {
  return parsed.questions.filter(
    (question) => question.answer !== undefined && !question.needsFigure,
  );
}
