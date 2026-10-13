/** Aritmética racional e equações lineares, sem executar código do usuário. */
type Rational = { n: bigint; d: bigint };
type Linear = { constant: Rational; coefficient: Rational };
export type MathCalculation =
  | {
      status: "checked";
      expression: string;
      kind: "arithmetic" | "linear-equation" | "equality";
      exact: string;
      steps: readonly string[];
      approximate?: string;
    }
  | { status: "unsupported" | "invalid"; expression: string; reason: string };
class CalculationError extends Error {
  constructor(
    readonly status: "unsupported" | "invalid",
    message: string,
  ) {
    super(message);
  }
}
const LIMIT = 10n ** 80n;
function rational(n: bigint, d = 1n): Rational {
  if (d === 0n) throw new CalculationError("invalid", "Divisão por zero não é definida.");
  if (n < -LIMIT || n > LIMIT || d < -LIMIT || d > LIMIT)
    throw new CalculationError("unsupported", "O cálculo ultrapassa o limite de tamanho.");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  let a = n < 0n ? -n : n,
    b = d;
  while (b) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return { n: n / a, d: d / a };
}
const ZERO = rational(0n),
  ONE = rational(1n);
const add = (a: Rational, b: Rational) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const negate = (a: Rational) => rational(-a.n, a.d);
const multiply = (a: Rational, b: Rational) => rational(a.n * b.n, a.d * b.d);
const divide = (a: Rational, b: Rational) => rational(a.n * b.d, a.d * b.n);
const scalar = (value: Rational): Linear => ({ constant: value, coefficient: ZERO });
function plus(a: Linear, b: Linear): Linear {
  return { constant: add(a.constant, b.constant), coefficient: add(a.coefficient, b.coefficient) };
}
function times(a: Linear, b: Linear): Linear {
  if (a.coefficient.n && b.coefficient.n)
    throw new CalculationError(
      "unsupported",
      "A ferramenta verifica apenas equações de primeiro grau.",
    );
  return {
    constant: multiply(a.constant, b.constant),
    coefficient: add(multiply(a.constant, b.coefficient), multiply(a.coefficient, b.constant)),
  };
}
function quotient(a: Linear, b: Linear): Linear {
  if (b.coefficient.n)
    throw new CalculationError("unsupported", "Divisores com variável exigem outra ferramenta.");
  return {
    constant: divide(a.constant, b.constant),
    coefficient: divide(a.coefficient, b.constant),
  };
}
function power(a: Linear, b: Linear): Linear {
  if (b.coefficient.n || b.constant.d !== 1n || b.constant.n < -12n || b.constant.n > 12n)
    throw new CalculationError("unsupported", "Use expoentes inteiros entre -12 e 12.");
  const exponent = Number(b.constant.n);
  if (a.coefficient.n && exponent !== 1)
    throw new CalculationError(
      "unsupported",
      "Potências de variáveis não são verificadas pela ferramenta linear.",
    );
  if (exponent === 0 && !a.constant.n && !a.coefficient.n)
    throw new CalculationError("invalid", "0 elevado a 0 não é definido por esta ferramenta.");
  let result = scalar(ONE);
  for (let i = 0; i < Math.abs(exponent); i++) result = times(result, a);
  return exponent < 0 ? quotient(scalar(ONE), result) : result;
}
class Parser {
  private index = 0;
  constructor(
    private readonly tokens: string[],
    private readonly steps: string[],
  ) {}
  private record(a: Linear, operator: string, b: Linear, result: Linear) {
    if (a.coefficient.n || b.coefficient.n || result.coefficient.n || this.steps.length >= 12)
      return;
    const display = (v: Rational) => {
      const text = formatted(v).exact;
      return v.n < 0n ? `(${text})` : text;
    };
    if (
      (operator === "+" || operator === "−") &&
      a.constant.d !== b.constant.d &&
      this.steps.length < 11
    ) {
      const denominator = rational(a.constant.d, b.constant.d).n * b.constant.d;
      this.steps.push(
        `Use o denominador comum ${denominator}: ${a.constant.n * (denominator / a.constant.d)}/${denominator} ${operator} ${b.constant.n * (denominator / b.constant.d)}/${denominator}.`,
      );
    }
    this.steps.push(
      `${display(a.constant)} ${operator} ${display(b.constant)} = ${formatted(result.constant).exact}.`,
    );
  }
  private peek() {
    return this.tokens[this.index];
  }
  private take(token: string) {
    if (this.peek() !== token) return false;
    this.index++;
    return true;
  }
  parse(): Linear {
    const result = this.sum(0);
    if (this.peek() !== undefined)
      throw new CalculationError("unsupported", "Expressão fora da sintaxe suportada.");
    return result;
  }
  private sum(depth: number): Linear {
    let value = this.product(depth);
    while (this.peek() === "+" || this.peek() === "-") {
      const minus = this.take("-");
      if (!minus) this.take("+");
      const next = this.product(depth);
      const result = plus(
        value,
        minus ? { constant: negate(next.constant), coefficient: negate(next.coefficient) } : next,
      );
      this.record(value, minus ? "−" : "+", next, result);
      value = result;
    }
    return value;
  }
  private product(depth: number): Linear {
    let value = this.unary(depth);
    while (this.peek() === "*" || this.peek() === "/") {
      const division = this.take("/");
      if (!division) this.take("*");
      const next = this.unary(depth);
      const result = division ? quotient(value, next) : times(value, next);
      this.record(value, division ? "÷" : "×", next, result);
      value = result;
    }
    return value;
  }
  private unary(depth: number): Linear {
    if (depth > 16) throw new CalculationError("unsupported", "Expressão muito aninhada.");
    if (this.take("+")) return this.unary(depth + 1);
    if (this.take("-")) {
      const v = this.unary(depth + 1);
      const result = { constant: negate(v.constant), coefficient: negate(v.coefficient) };
      this.record(scalar(ZERO), "−", v, result);
      return result;
    }
    let value = this.atom(depth);
    if (this.take("%")) {
      const hundred = scalar(rational(100n));
      const result = quotient(value, hundred);
      this.record(value, "÷", hundred, result);
      value = result;
    }
    if (this.take("^")) {
      const exponent = this.unary(depth + 1);
      const result = power(value, exponent);
      this.record(value, "^", exponent, result);
      value = result;
    }
    return value;
  }
  private atom(depth: number): Linear {
    if (this.take("(")) {
      const value = this.sum(depth + 1);
      if (!this.take(")")) throw new CalculationError("invalid", "Parênteses não fechados.");
      return value;
    }
    if (this.take("x")) return { constant: ZERO, coefficient: ONE };
    const token = this.peek();
    if (token === undefined || !/^\d+(?:\.\d+)?$/.test(token))
      throw new CalculationError("invalid", "Falta um número ou uma variável válida.");
    this.index++;
    const [integer, decimal = ""] = token.split(".");
    return scalar(rational(BigInt(`${integer}${decimal}`), 10n ** BigInt(decimal.length)));
  }
}
function normalized(expression: string): string {
  return expression
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/×|·/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/,/g, ".")
    .replace(/\bde\b/g, "*")
    .replace(/\s+/g, "");
}
function parse(expression: string, steps: string[]): Linear {
  // Somente multiplicação implícita inequívoca: 2x, 2(x+1), (x+1)2.
  const text = expression.replace(/(\d|\))(?=x|\()/g, "$1*").replace(/\)(?=\d)/g, ")*");
  const tokens = text.match(/\d+(?:\.\d+)?|[x+*/^%()=-]/g) ?? [];
  if (tokens.join("") !== text || tokens.length > 96 || tokens.some((t) => t.length > 32))
    throw new CalculationError(
      "unsupported",
      "Use números, x, parênteses e operações básicas; sem funções ou código.",
    );
  return new Parser(tokens, steps).parse();
}
function formatted(value: Rational) {
  const exact = value.d === 1n ? String(value.n) : `${value.n}/${value.d}`;
  return value.d === 1n
    ? { exact }
    : {
        exact,
        approximate: String(Number((Number(value.n) / Number(value.d)).toPrecision(12))).replace(
          ".",
          ",",
        ),
      };
}
export function calculateMath(expression: string): MathCalculation {
  if (!expression.trim() || expression.length > 240)
    return {
      status: "unsupported",
      expression: expression.slice(0, 240),
      reason: "Expressão vazia ou muito longa.",
    };
  try {
    if (/\d\s+\d|\d[.,]\s|\d\s+[.,]/.test(expression) || /[1-9]\d*\.\d{3}(?!\d)/.test(expression))
      throw new CalculationError(
        "unsupported",
        "Escreva os números sem separador de milhares; use vírgula para decimais.",
      );
    const text = normalized(expression),
      sides = text.split("=");
    if (sides.length > 2) throw new CalculationError("unsupported", "Use uma única igualdade.");
    const steps: string[] = [];
    const left = parse(sides[0]!, steps);
    if (sides.length === 1) {
      if (left.coefficient.n)
        throw new CalculationError("unsupported", "Informe uma equação para determinar x.");
      return {
        status: "checked",
        expression,
        kind: "arithmetic",
        steps,
        ...formatted(left.constant),
      };
    }
    const right = parse(sides[1]!, steps);
    const coefficient = add(left.coefficient, negate(right.coefficient));
    const constant = add(right.constant, negate(left.constant));
    if (!coefficient.n) {
      if (text.includes("x"))
        return {
          status: "checked",
          expression,
          kind: "linear-equation",
          exact: constant.n ? "sem solução" : "infinitas soluções",
          steps: [
            `Reunindo os termos, obtemos 0 × x = ${formatted(constant).exact}.`,
            constant.n
              ? "Nenhum valor de x satisfaz essa igualdade."
              : "Qualquer valor de x satisfaz essa igualdade.",
          ],
        };
      return {
        status: "checked",
        expression,
        kind: "equality",
        exact: constant.n ? "falso" : "verdadeiro",
        steps: [
          `O lado esquerdo vale ${formatted(left.constant).exact} e o direito vale ${formatted(right.constant).exact}.`,
        ],
      };
    }
    const value = divide(constant, coefficient);
    const result = formatted(value);
    const substituted = add(left.constant, multiply(left.coefficient, value));
    return {
      status: "checked",
      expression,
      kind: "linear-equation",
      exact: `x = ${result.exact}`,
      steps: [
        `Reúna os termos com x de um lado e os constantes do outro: ${formatted(coefficient).exact} × x = ${formatted(constant).exact}.`,
        `Divida os dois lados por ${formatted(coefficient).exact}: x = ${result.exact}.`,
        `Substituindo x = ${result.exact}, os dois lados valem ${formatted(substituted).exact}.`,
      ],
      ...(result.approximate ? { approximate: `x ≈ ${result.approximate}` } : {}),
    };
  } catch (error) {
    if (error instanceof CalculationError)
      return { status: error.status, expression, reason: error.message };
    return {
      status: "unsupported",
      expression,
      reason: "O cálculo excede os limites da ferramenta.",
    };
  }
}
const NUMBER_ONLY_SUFFIX =
  /\s+Responda (?:somente|apenas) o número ou a fração simplificada, sem explicação\.?$/i;
const EXPLANATION_SUFFIX = /\s+Explique por etapas curtas\.?$/i;

export function requestsNumberOnly(prompt: string): boolean {
  return NUMBER_ONLY_SUFFIX.test(prompt.trim());
}

/** Nunca extrai uma conta de histórico, material enviado ou enunciado ambíguo. */
export function requestedCalculation(prompt: string): MathCalculation | undefined {
  let expression = prompt
    .trim()
    .replace(NUMBER_ONLY_SUFFIX, "")
    .replace(EXPLANATION_SUFFIX, "")
    .replace(/[?.]+$/, "")
    .trim()
    .replace(/²/g, "^2")
    .replace(/³/g, "^3");
  expression = expression.replace(
    /^(?:quanto (?:é|e|dá|da|vale)|explique(?: o cálculo| a conta| a equação)?|me ajude a (?:calcular|resolver)|calcule|calcular|resolva(?: a equação)?|verifique|confira|qual (?:é|e) o resultado de)\s*:?\s*/i,
    "",
  );
  if (
    !/[+*/×÷^%=−-]|\d\s*[xX(]/.test(expression) ||
    !/^[\d\s.,+*/×÷·^%=()xX−-]+(?:\s+de\s+[\d\s.,+*/×÷·^%=()xX−-]+)?$/.test(expression)
  )
    return undefined;
  return calculateMath(expression);
}
