import { readKeyLines } from "./exam-key";
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

/** Um gabarito com o título da prova a que pertence (arquivo com várias provas ou versões). */
export type KeySection = { title: string; key: Record<number, number> };

export type ParsedExam = {
  questions: ExamQuestion[];
  /** Começo do texto do arquivo, para casar a prova com o gabarito certo. */
  head: string;
  /** Gabaritos que estão só em linhas de resposta (sem a prova), um por título. */
  keys: KeySection[];
  hasAnswerKey: boolean;
  /** Havia vários gabaritos e nenhum combinou melhor com esta prova. */
  keyAmbiguous?: boolean;
  /** Gabarito lido no arquivo: número da questão para índice da alternativa. */
  key: Record<number, number>;
  answered: number;
  figureQuestions: number;
  /** Questões discursivas ("Questão 1 (Valor: 1,5 ponto)"): sem alternativas, não viram quiz. */
  essays: number;
};

const LETTERS = ["A", "B", "C", "D", "E"];
const MARKER =
  /(?<![\p{L}\p{N}])(?:(?<q>quest[ãa]o\s*(?:n[º°o.]*\s*)?(?<qn>\d{1,3})\s*[.)\-–:]?)|(?<n>(?<nn>\d{1,3})\s*[.)\-–]\s+(?=[\p{L}"“.…(]))|(?<o>\(?(?<ol>[A-Ea-e])\)+\s*)|(?<k>(?:gabarito|respostas?(?:\s+correta)?|alternativa\s+correta|chave\s+de\s+corre[çc][ãa]o|answer\s+key)(?![\p{L}])\s*[:\-–]?\s*))/giu;
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
  /** Pedaços de fórmula (fração, expoente) caíram soltos no texto: enunciado ou alternativas saem trocados. */
  garbled?: boolean;
};

const SHARED =
  /quest[õo]es\s+(?:de\s+)?n[úu]meros?\s+(\d{1,3})\s*(?:a|à|ao|e)\s*(\d{1,3})\s+(?:baseiam|referem|relacionam)/i;
const SUPPORT_LEAD = /^(?:aten[çc][ãa]o|leia|texto|observe|considere)\b/i;
const endsSentence = (text: string) => /[.?!;:]$/.test(text);
const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** Lê as questões e o gabarito de um documento. Não decide se é uma prova: veja `isExam`. */
export function parseExam(doc: StructuredDocument): ParsedExam {
  const drafts: Draft[] = [];
  const key = new Map<number, number>();
  let current: Draft | undefined;
  let lastNumber = 0;
  let support = "";
  /** Depois de começar o texto de apoio, as linhas seguintes são dele até a próxima questão. */
  let supportOpen = false;
  let shared: { from: number; to: number; text: string } | undefined;
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
    if (!piece) return;
    if (/^aten[çc][ãa]o\b/i.test(piece) && SHARED.test(piece)) {
      support = piece;
      supportOpen = true;
      return;
    }
    if (!current) {
      support = clean(`${support} ${piece}`);
      return;
    }
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
      supportOpen ||
      (startOfBlock &&
        current.options.length >= 3 &&
        endsSentence(previous) &&
        /^\p{Lu}/u.test(piece) &&
        (piece.length > 60 || SUPPORT_LEAD.test(piece)));
    if (looksLikeSupport) {
      supportOpen = true;
      support = clean(`${support} ${piece}`);
    } else current.options[last] = clean(`${previous} ${piece}`);
  }

  // As linhas cruas do PDF não passam pela classificação de títulos e ruído da montagem de parágrafos.
  const source = doc.lines ?? doc.blocks;
  const { sections: keySections, consumed } = readKeyLines(source);
  for (const [lineIndex, block] of source.entries()) {
    if (consumed.has(lineIndex)) continue;
    const text = block.text;
    if (/^[\s_\-=*.\u2022\u2014\u2013]{5,}$/.test(text)) continue;
    // Marca d'água de rascunho e título de seção ("CIÊNCIAS DA NATUREZA") no pé da questão não são
    // parte da última alternativa.
    if (/^\s*rascunho\s*$/i.test(text)) continue;
    if (
      current &&
      current.options.length >= 3 &&
      /^[\p{Lu}\s]{10,}$/u.test(text.trim()) &&
      text.trim().split(/\s+/).length >= 2
    )
      continue;
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
    // Número sozinho na linha (PUC-Rio e outras provas de duas colunas: o número fica acima do
    // enunciado, sem ponto nem parêntese). Só abre questão se a linha seguinte começa o enunciado:
    // restos de fração ("2", "3"), alternativas e números de página não têm enunciado depois.
    const bare = inKey ? null : /^\s*(\d{1,3})\s*$/.exec(text);
    if (bare) {
      const next = source[lineIndex + 1]?.text.trim() ?? "";
      const startsStem =
        next.length >= 2 && !/^\(?[A-Ea-e]\)/.test(next) && !/^[\d\s]+$/.test(next);
      const open = current !== undefined && current.options.length >= 3;
      if (startsStem && (open || current === undefined || current.options.length === 0))
        pending.push({ index: 0, end: text.length, kind: "n", value: bare[1]! });
      // Número solto dentro da questão: resto de fração ou expoente que o PDF separou da conta.
      else if (current && current.options.length > 0) current.garbled = true;
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
        // "CARTÃO-RESPOSTA" nas instruções da prova não é o começo do gabarito: a palavra vem colada
        // a outra por hífen, ou no meio da frase.
        const glued = /\p{L}-$/u.test(text.slice(0, item.index));
        const startsLine = text.slice(0, item.index).trim() === "";
        const heading = !glued && /^(?:gabarito|respostas?|chave|answer)/i.test(marker);
        const after = text.slice(item.end);
        // "Gabarito: B" dentro da questão é a resposta dela, não o começo do gabarito geral.
        const inlineLetter = /^\s*\(?([A-Ea-e])\)?(?![\p{L}\d])/u.exec(after);
        const wholeKey = /^\s*\d/.test(after);
        if (current && inlineLetter && !wholeKey && hasSeparator) {
          current.answer = LETTERS.indexOf(inlineLetter[1]!.toUpperCase());
          cursor = item.end + inlineLetter[0].length;
        } else if (
          heading &&
          (wholeKey ||
            (drafts.length >= 3 && (startsLine || hasSeparator)) ||
            (startsLine && /^\s*$/.test(after.slice(0, 3))))
        ) {
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
        // "01 - O candidato..." (zero à esquerda e traço) é item de instrução, não questão.
        const instruction =
          item.kind === "n" && /^0\d+\s*[-–]/.test(text.slice(item.index, item.end));
        const capital =
          !instruction && (item.kind === "q" || !/^\p{Ll}/u.test(text.charAt(item.end)));
        const accepts =
          capital &&
          number >= 1 &&
          (lastNumber === 0 ? number <= 3 : number > lastNumber && number <= lastNumber + 3);
        if (accepts) {
          if (current) drafts.push(current);
          lastNumber = number;
          const range = SHARED.exec(support);
          if (range) {
            shared = {
              from: Number(range[1]),
              to: Number(range[2]),
              text: clean(
                support.replace(
                  /^\s*aten[çc][ãa]o:?[^.]*?(?:baseiam|referem|relacionam)\S*\s+(?:no|ao|aos|nos)\s+\S+(?:\s+(?:apresentado\s+abaixo|abaixo|a\s+seguir|seguinte))?\.?\s*/i,
                  "",
                ),
              ),
            };
          }
          const covered = shared && number >= shared.from && number <= shared.to;
          // Antes da primeira questão só vale como apoio o que parece texto-base, não as instruções.
          const firstQuestion = drafts.length === 0 && current === undefined;
          const looksLikeBase =
            SUPPORT_LEAD.test(support) ||
            /\((?:adaptado|fonte|dispon[ií]vel|extra[ií]do)/i.test(support);
          const own = range || (firstQuestion && !looksLikeBase) ? "" : support;
          current = {
            number,
            context: covered ? shared!.text : own,
            stem: "",
            options: [],
            page: block.page,
          };
          support = "";
          supportOpen = false;
        } else if (
          item.kind === "q" &&
          number <= lastNumber &&
          current &&
          current.options.length >= 3
        ) {
          // "Questão 1" depois da última objetiva: começa outra parte da prova (discursiva), e o
          // texto dela não é continuação da última alternativa.
          drafts.push(current);
          current = undefined;
          lastNumber = 0;
          support = "";
          supportOpen = false;
          cursor = item.end;
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
    } else if (current && current.options.length === 0 && pending.length === 0) {
      continueWith(tail, true);
    } else {
      // sem questão aberta, o texto solto é apoio da próxima (instruções e texto-base)
      continueWith(tail, first);
    }
  }
  if (current) drafts.push(current);

  // Alternativas que são só figura (sem texto) continuam sendo a questão, marcada como figura.
  const kept = drafts.filter((draft) => draft.options.length >= 3 && draft.stem.length >= 8);
  const questions: ExamQuestion[] = kept.map((draft) => {
    const own = keySections.length === 1 ? keySections[0]!.key[draft.number] : undefined;
    const keyed = key.get(draft.number) ?? own;
    const answer = draft.answer ?? keyed;
    const options = draft.options.map((option) => clean(option.replace(/\brascunho\b/gi, "")));
    return {
      number: draft.number,
      context: draft.context,
      stem: draft.stem,
      options,
      ...(answer !== undefined && answer < options.length ? { answer } : {}),
      page: draft.page,
      needsFigure:
        FIGURE.test(`${draft.context} ${draft.stem}`) ||
        draft.garbled === true ||
        options.some((option) => !option),
    };
  });
  const answered = questions.filter((question) => question.answer !== undefined).length;
  return {
    questions,
    head: clean(
      source
        .slice(0, 40)
        .map((line) => line.text)
        .join(" "),
    ).slice(0, 900),
    keys: keySections,
    hasAnswerKey: key.size > 0 || answered > 0 || keySections.length > 0,
    key: { ...(keySections.length === 1 ? keySections[0]!.key : {}), ...Object.fromEntries(key) },
    answered,
    figureQuestions: questions.filter((question) => question.needsFigure).length,
    essays: source.filter((line) => /^Quest[ãa]o\s*\d+\s*\(\s*valor/i.test(line.text.trim()))
      .length,
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
