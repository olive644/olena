const SUPER = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUB = "₀₁₂₃₄₅₆₇₈₉";

// Apresentação somente: não interpretar nem calcular expressões recebidas.
export function formatMathNotation(original: string): string {
  if (/\^[−+-]?\d+[A-Za-z]/.test(original))
    return `${original} (expoente ambíguo: falta delimitar onde termina)`;
  const hasDerivative = /[A-Za-z][′']\(/.test(original);
  let text = original
    .replace(/\bsqrt\(([^()]+)\)/g, (_, argument: string) =>
      /^[A-Za-z0-9]+$/.test(argument) ? `√${argument}` : `√(${argument})`,
    )
    .replace(/\b([A-Za-z])\^\(1\/2\)/g, "√$1")
    .replace(/_([−+-]?\d+)/g, (_, digits: string) =>
      [...digits]
        .map((c) => (c === "−" || c === "-" ? "₋" : c === "+" ? "₊" : SUB[Number(c)]))
        .join(""),
    )
    .replace(/\^([−+-]?\d+[.,]\d+)/g, "^($1)")
    .replace(/\^(?:\(([−+-]?\d+)\)|([−+-]?\d+)(?![\dA-Za-z]|[.,]\d))/g, (_, a: string, b: string) =>
      [...(a ?? b)]
        .map((c) => (c === "−" || c === "-" ? "⁻" : c === "+" ? "⁺" : SUPER[Number(c)]))
        .join(""),
    )
    .replace(/\^([A-Za-z]+)/g, "^($1)")
    .replace(/(\d)(?=[xyzt√])/g, "$1 · ")
    .replace(/\b([xyzt])(?=[xyzt]\b)/g, "$1 · ");
  if (hasDerivative)
    text = text.replace(/\b([A-Za-z])\(([-−]?\d+(?:[.,+]\d+)*|[a-wyz])\)/g, "$& (valor da função)");
  text = text
    .replace(
      /\b([A-Za-z])[′']\(([-−]?\d+(?:[.,]\d+)?)\)(\s*=\s*)?/g,
      (_, name: string, point: string, equals: string) => {
        const label = `derivada de ${name}, calculada em x=${point}`;
        return equals ? `${label}: ` : `(${label})`;
      },
    )
    .replace(/\b([A-Za-z])[′']\(([A-Za-z])\)/g, "$1'($2) (derivada de $1)");
  return text;
}
