import { definitionQuestion } from "./facts";
import type { Fact } from "./summarize";
import { falseVersion, looksLikeStatement, numbersIn } from "./true-false";
import type { Language } from "./types";

// Perguntas de múltipla escolha a partir do texto do próprio arquivo, sem IA. Cada tipo tem
// alternativas do mesmo tipo da resposta certa: definições trocadas, anos e valores próximos, e
// afirmações falsas feitas de outras frases. A frase de origem fica como explicação.

export type QuizDifficulty = "easy" | "medium" | "hard";
export type GeneratedQuestion = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  page: number;
};

const FOUR = 4;

const strip = (text: string) => text.replace(/[.;:,\s]+$/, "").trim();
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** A resposta fica numa posição que varia sem sorteio, para não formar padrão. */
function place(
  correct: string,
  wrong: string[],
  serial: number,
): { options: string[]; answer: number } {
  const options = [...wrong];
  const answer = (serial * 3 + 1) % (wrong.length + 1);
  options.splice(answer, 0, correct);
  return { options, answer };
}

/** Primeira oração da definição, curta o bastante para ser uma alternativa. */
function shortRest(rest: string): string {
  const first = strip(rest.split(/(?<=[a-zà-ú])\.\s+(?=\p{Lu})/u)[0] ?? rest);
  return first.length > 150 ? `${first.slice(0, 147).replace(/\s+\S*$/, "")}...` : first;
}

function nearYears(
  correct: number,
  avoid: ReadonlySet<number>,
  serial: number,
  hard: boolean,
): number[] {
  const steps = hard ? [1, 2, 3, 5, 7, 10] : [5, 10, 15, 25, 40];
  const out: number[] = [];
  for (let step = 0; step < steps.length && out.length < FOUR - 1; step += 1) {
    const sign = (serial + step) % 2 === 0 ? 1 : -1;
    for (const candidate of [correct + sign * steps[step]!, correct - sign * steps[step]!]) {
      if (
        candidate >= 1000 &&
        candidate <= 2100 &&
        !avoid.has(candidate) &&
        !out.includes(candidate)
      )
        out.push(candidate);
      if (out.length >= FOUR - 1) break;
    }
  }
  return out;
}

function numberVariants(value: number, decimals: number, hard: boolean): number[] {
  const factors = hard ? [0.8, 1.2, 1.5, 0.5] : [0.5, 2, 0.25, 4, 10];
  const out: number[] = [];
  for (const factor of factors) {
    const candidate = Number((value * factor).toFixed(decimals));
    if (candidate > 0 && candidate !== value && !out.includes(candidate)) out.push(candidate);
    if (out.length >= FOUR - 1) break;
  }
  return out;
}

const format = (value: number, decimals: number) =>
  value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: value >= 10000,
  });

/** Perguntas do arquivo, intercalando tipos. Nunca devolve pergunta sem 3 alternativas erradas. */
export function questionsFromFacts(
  facts: readonly Fact[],
  language: Language,
  difficulty: QuizDifficulty,
  limit: number,
): GeneratedQuestion[] {
  const ordered = [...facts].sort((a, b) => b.score - a.score);
  const hard = difficulty === "hard";
  const definitions = ordered.filter((fact) => fact.definition);
  const years = ordered.filter((fact) => fact.years.length === 1);
  const allYears = new Set(
    ordered.flatMap((fact) => fact.years.map(Number)).filter((year) => Number.isFinite(year)),
  );
  const quantities = ordered.filter((fact) => /\d/.test(fact.text) && fact.years.length === 0);
  const queues: { name: string; items: (() => GeneratedQuestion | undefined)[] }[] = [];
  const used = new Set<number>();
  const mark = (fact: Fact) => {
    if (used.has(fact.id)) return false;
    used.add(fact.id);
    return true;
  };

  // 1) definição: o que é X? (a definição certa entre definições de outros termos)
  //    e o inverso: qual termo corresponde a esta definição?
  const defItems: (() => GeneratedQuestion | undefined)[] = [];
  definitions.forEach((fact, index) => {
    const def = fact.definition!;
    const others = definitions.filter(
      (other) => other.id !== fact.id && norm(other.definition!.term) !== norm(def.term),
    );
    if (others.length < FOUR - 1) return;
    const rest = shortRest(def.rest);
    const byTerm = index % 2 === 0 || hard;
    defItems.push(() => {
      if (!mark(fact)) return undefined;
      if (byTerm) {
        const wrong = others
          .map((other) => shortRest(other.definition!.rest))
          .filter((text) => norm(text) !== norm(rest))
          .sort((a, b) => Math.abs(a.length - rest.length) - Math.abs(b.length - rest.length))
          .slice(0, FOUR - 1);
        if (wrong.length < FOUR - 1) return undefined;
        const prompt = definitionQuestion(
          { term: def.term, verb: def.verb, plural: def.plural, sentence: fact.text },
          language,
        );
        return {
          prompt,
          ...place(cap(rest), wrong.map(cap), index),
          explanation: fact.text,
          page: fact.page,
        };
      }
      const wrong = others
        .map((other) => other.definition!.term)
        .filter((term, at, list) => list.indexOf(term) === at)
        .slice(0, FOUR - 1);
      if (wrong.length < FOUR - 1) return undefined;
      return {
        prompt:
          language === "en"
            ? `Which term matches this definition: "${rest}"?`
            : `Qual termo corresponde a esta definição: «${rest}»?`,
        ...place(cap(def.term), wrong.map(cap), index),
        explanation: fact.text,
        page: fact.page,
      };
    });
  });
  queues.push({ name: "definition", items: defItems });

  // 2) ano: alternativas próximas da data certa, nunca outro ano da mesma frase
  const yearItems: (() => GeneratedQuestion | undefined)[] = [];
  years.forEach((fact, index) => {
    const correct = Number(fact.years[0]);
    const text = fact.text;
    const at = text.indexOf(String(correct));
    if (at < 0) return;
    const wrong = nearYears(correct, allYears, index, hard);
    if (wrong.length < FOUR - 1) return;
    yearItems.push(() => {
      if (!mark(fact)) return undefined;
      const blank = `${text.slice(0, at)}_____${text.slice(at + String(correct).length)}`;
      return {
        prompt:
          language === "en"
            ? `Which year completes the information from the text? "${blank}"`
            : `Qual ano completa corretamente a informação do texto? «${blank}»`,
        ...place(String(correct), wrong.map(String), index),
        explanation: text,
        page: fact.page,
      };
    });
  });
  queues.push({ name: "year", items: yearItems });

  // 3) valor: números do mesmo tipo e da mesma ordem de grandeza
  const quantityItems: (() => GeneratedQuestion | undefined)[] = [];
  quantities.forEach((fact, index) => {
    const match =
      /(?<![\p{L}\p{N}.,])(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?(?![\p{L}\p{N}])/u.exec(
        fact.text,
      );
    if (!match || match.index === 0) return;
    const decimals = match[2]?.length ?? 0;
    const value = Number(`${match[1]!.replace(/\./g, "")}${decimals ? "." + match[2] : ""}`);
    if (!Number.isFinite(value) || value < 10) return;
    const variants = numberVariants(value, decimals, hard);
    if (variants.length < FOUR - 1) return;
    quantityItems.push(() => {
      if (!mark(fact)) return undefined;
      const blank = `${fact.text.slice(0, match.index)}_____${fact.text.slice(match.index + match[0].length)}`;
      return {
        prompt:
          language === "en"
            ? `Which value completes the information from the text? "${blank}"`
            : `Qual valor completa corretamente a informação do texto? «${blank}»`,
        ...place(
          format(value, decimals),
          variants.slice(0, FOUR - 1).map((variant) => format(variant, decimals)),
          index,
        ),
        explanation: fact.text,
        page: fact.page,
      };
    });
  });
  queues.push({ name: "quantity", items: quantityItems });

  // 4) afirmação: qual está de acordo (ou não) com o texto
  const numbers = [...new Set(ordered.flatMap((fact) => numbersIn(fact.text)))];
  const statementItems: (() => GeneratedQuestion | undefined)[] = [];
  const usedFalse = new Set<string>();
  ordered.forEach((fact, index) => {
    const falses: string[] = [];
    for (let step = 1; step < ordered.length && falses.length < FOUR - 1; step += 1) {
      const other = ordered[(index + step * 3) % ordered.length]!;
      if (other.id === fact.id) continue;
      const wrong = falseVersion(other.text, {
        index: other.id,
        language,
        numbers,
        definitions: [],
      });
      if (
        wrong &&
        looksLikeStatement(wrong, language) &&
        !ordered.some((item) => norm(item.text) === norm(wrong)) &&
        !falses.some((item) => norm(item) === norm(wrong)) &&
        !usedFalse.has(norm(wrong))
      )
        falses.push(wrong);
    }
    if (falses.length < FOUR - 1) return;
    statementItems.push(() => {
      if (falses.some((item) => usedFalse.has(norm(item)))) return undefined;
      if (!mark(fact)) return undefined;
      for (const item of falses) usedFalse.add(norm(item));
      return {
        prompt:
          language === "en"
            ? "Which statement agrees with the text?"
            : "Qual das afirmações está de acordo com o texto?",
        ...place(fact.text, falses, index),
        explanation: fact.text,
        page: fact.page,
      };
    });
  });
  queues.push({ name: "statement", items: statementItems });

  // 5) o contrário: qual afirmação NÃO está de acordo. Precisa de uma só falsa e três verdadeiras,
  //    então rende perguntas mesmo em texto com poucos números e definições.
  const negativeItems: (() => GeneratedQuestion | undefined)[] = [];
  ordered.forEach((fact, index) => {
    const wrong = falseVersion(fact.text, { index: fact.id, language, numbers, definitions: [] });
    if (
      !wrong ||
      !looksLikeStatement(wrong, language) ||
      ordered.some((item) => norm(item.text) === norm(wrong))
    )
      return;
    const trues: string[] = [];
    for (let step = 1; step < ordered.length && trues.length < FOUR - 1; step += 1) {
      const other = ordered[(index + step * 2 + 1) % ordered.length]!;
      if (other.id !== fact.id && !trues.includes(other.text)) trues.push(other.text);
    }
    if (trues.length < FOUR - 1) return;
    negativeItems.push(() => {
      if (!mark(fact)) return undefined;
      return {
        prompt:
          language === "en"
            ? "Which statement does NOT agree with the text?"
            : "Qual das afirmações NÃO está de acordo com o texto?",
        ...place(wrong, trues, index),
        explanation:
          language === "en" ? `The text says: ${fact.text}` : `O texto diz: ${fact.text}`,
        page: fact.page,
      };
    });
  });
  queues.push({ name: "negative", items: negativeItems });

  // Mistura os tipos um de cada vez, na ordem que combina com a dificuldade.
  const order =
    difficulty === "easy"
      ? ["definition", "year", "statement", "quantity", "negative"]
      : hard
        ? ["negative", "statement", "quantity", "year", "definition"]
        : ["definition", "year", "quantity", "statement", "negative"];
  const sorted = order.map((name) => queues.find((queue) => queue.name === name)!);
  const questions: GeneratedQuestion[] = [];
  const seenPrompts = new Set<string>();
  let progressed = true;
  while (questions.length < limit && progressed) {
    progressed = false;
    for (const queue of sorted) {
      while (queue.items.length && questions.length < limit) {
        const build = queue.items.shift()!;
        const question = build();
        if (!question) continue;
        const key = norm(question.prompt);
        if (seenPrompts.has(key)) continue;
        seenPrompts.add(key);
        questions.push(question);
        progressed = true;
        break;
      }
    }
  }
  return questions;
}
