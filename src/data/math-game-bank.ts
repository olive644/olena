import { type MathCourseId, MATH_COURSES } from "./math-courses.js";
import { type MathChallenge } from "../domain/adaptive-math.js";

// Banco autoral fechado: quatro formatos por etapa, seis versões editoriais fixas.
// Não há geração por IA, cópia de prova ou alegação de revisão pedagógica humana.
type Entry = readonly [prompt: string, answer: number];
type Formats = readonly ((n: number) => Entry)[];
export type MathBankQuestion = MathChallenge & {
  id: string;
  revision: 1;
  format: number;
  source: string;
};
export const THOMPSON_SOURCE =
  "Calculus Made Easy, Silvanus P. Thompson, edição de 1914, exercícios I, p. 24; gabarito p. 252. https://www.gutenberg.org/files/33283/33283-h/33283-h.htm";
const FORMATS: Record<MathCourseId, readonly Formats[]> = {
  foundations: [
    [
      (n) => [`${n + 8} + ${n + 3}`, 2 * n + 11],
      (n) => [`Complete: ${n + 4} + ? = ${3 * n + 9}`, 2 * n + 5],
      (n) => [`${n} moedas e mais ${n + 7}. Total?`, 2 * n + 7],
      (n) => [`${n + 6} + ${n + 2} + ${n}. Resultado?`, 3 * n + 8],
    ],
    [
      (n) => [`${4 * n + 9} − ${n + 3}`, 3 * n + 6],
      (n) => [`Complete: ${3 * n + 8} − ? = ${n + 2}`, 2 * n + 6],
      (n) => [`Havia ${5 * n} fichas. Saíram ${2 * n}. Quantas ficaram?`, 3 * n],
      (n) => [`De ${n + 7} para ${3 * n + 10}, faltam quantos?`, 2 * n + 3],
    ],
    [
      (n) => [`${n + 2} × ${n + 3}`, (n + 2) * (n + 3)],
      (n) => [`${n} caixas com ${n + 5} peças cada. Total?`, n * (n + 5)],
      (n) => [`Complete: ${n + 2} × ? = ${(n + 2) * (n + 4)}`, n + 4],
      (n) => [`Dobro de ${n + 3}, depois triplo. Resultado?`, 6 * (n + 3)],
    ],
    [
      (n) => [`${n * (n + 3)} ÷ ${n}`, n + 3],
      (n) => [`${n * (n + 5)} fichas em ${n + 5} grupos iguais. Quantas por grupo?`, n],
      (n) => [`Complete: ${(n + 2) * (n + 4)} ÷ ? = ${n + 4}`, n + 2],
      (n) => [`${n * 4 + 2} peças em caixas de 4. Quantas caixas completas?`, n],
    ],
    [
      (n) => [`1/4 de ${n * 12}`, n * 3],
      (n) => [`3/4 de ${n * 8}`, n * 6],
      (n) => [`Metade de ${n * 6}, mais um terço de ${n * 6}. Resultado?`, n * 5],
      (n) => [`De ${n * 8} peças, 3/8 foram usadas. Quantas sobraram?`, n * 5],
    ],
    [
      (n) => [`25% de ${n * 20}`, n * 5],
      (n) => [`Preço ${n * 20}. Desconto de 20%. Quanto pagar?`, n * 16],
      (n) => [`${n * 3} de ${n * 12} fichas são azuis. Qual porcentagem?`, 25],
      (n) => [`Preço ${n * 10}. Aumento de 30%. Novo preço?`, n * 13],
    ],
  ],
  school: [
    [
      (n) => [`${n}x + ${n + 2} = ${n * 4 + n + 2}. x = ?`, 4],
      (n) => [`2(x + ${n}) = ${6 * n}. x = ?`, 2 * n],
      (n) => [`3x − ${n} = ${5 * n}. x = ?`, 2 * n],
      (n) => [`${n + 2} caixas iguais pesam ${(n + 2) * (n + 3)} kg. Peso de uma?`, n + 3],
    ],
    [
      (n) => [`${n}³`, n ** 3],
      (n) => [`2^${n} × 2²`, 2 ** (n + 2)],
      (n) => [`(${n}²)²`, n ** 4],
      (n) => [`${n}³ ÷ ${n}²`, n],
    ],
    [
      (n) => [`f(x) = 2x + ${n}. f(${n + 1}) = ?`, 3 * n + 2],
      (n) => [`f(x) = ${n}x − 1. f(x) = ${3 * n - 1}. x = ?`, 3],
      (n) => [`Taxa de ${n} reais e ${n + 2} por km. Preço para 4 km?`, 5 * n + 8],
      (n) => [`f(x) = x² − ${n}. f(−${n}) = ?`, n * n - n],
    ],
    [
      (n) => [`Retângulo ${n} × ${n + 3}. Perímetro?`, 4 * n + 6],
      (n) => [`Triângulo: base ${2 * n}, altura ${n + 2}. Área?`, n * (n + 2)],
      (n) => [`Quadrado: área ${n * n}. Lado?`, n],
      (n) => [`Cercado ${n} × ${n + 2}, portão de 1. Metros de cerca?`, 4 * n + 3],
    ],
    [
      (n) => [`PA: ${n}, ${n + 3}, ${n + 6}. Sexto termo?`, n + 15],
      (n) => [`PG: ${n}, ${2 * n}, ${4 * n}. Próximo?`, 8 * n],
      (n) => [`PA de razão ${n}, primeiro termo 2. Quinto termo?`, 2 + 4 * n],
      (n) => [`${n}, ${n + 2}, ${n + 6}, ${n + 12}. Próximo?`, n + 20],
    ],
    [
      (n) => [`${n} azuis e ${3 * n} vermelhas. Chance de azul em %?`, 25],
      (n) => [`${n} azuis e ${n} brancas. Chance de azul em %?`, 50],
      (n) => [`${3 * n} acertos em ${5 * n} tentativas. Porcentagem?`, 60],
      (n) => [`${n} verdes e ${4 * n} brancas. Chance de não ser verde em %?`, 80],
    ],
  ],
  advanced: [
    [
      (n) => [`f(x) = |x − ${n}|. f(${n - 3}) = ?`, 3],
      (n) => [`f(x) = x² − 2x. f(${n}) = ?`, n * n - 2 * n],
      (n) => [`f(x) = ${n}/x. f(1/2) = ?`, 2 * n],
      (n) => [`f(x) = 2x + ${n}. f⁻¹(${n + 6}) = ?`, 3],
    ],
    [
      (n) => [`log₂(${2 ** n})`, n],
      (n) => [`log₁₀(${10 ** n})`, n],
      (n) => [`log₂(${2 ** n}) + log₂(4)`, n + 2],
      (n) => [`log₃(${3 ** n})`, n],
    ],
    [
      (n) => [`${2 * n} sen(30°)`, n],
      (n) => [`${n} cos(180°)`, -n],
      (n) => [`${n} tan(45°) + 2`, n + 2],
      (n) => [`${n} sen(0°) + ${n + 3} cos(0°)`, n + 3],
    ],
    [
      (n) => [`(${n}, 2) · (3, ${n + 1})`, 5 * n + 2],
      (n) => [`(${n}, 2) + (3, 4). Primeira coordenada?`, n + 3],
      (n) => [`Vetor (${3 * n}, ${4 * n}). Comprimento?`, 5 * n],
      (n) => [`(${n}, 2) · (2, −${n})`, 0],
    ],
    [
      (n) => [`f(x)=x+${n}, g(x)=2x. g(f(3)) = ?`, 2 * n + 6],
      (n) => [`f(x)=x², g(x)=x+1. f(g(${n})) = ?`, (n + 1) ** 2],
      (n) => [`f(x)=3x, g(x)=x−${n}. f(g(${n + 2})) = ?`, 6],
      (n) => [`f(x)=x+${n}, g(x)=x². g(f(1)) = ?`, (n + 1) ** 2],
    ],
    [
      (n) => [`f(x)=x². Taxa média entre ${n} e ${n + 2}?`, 2 * n + 2],
      (n) => [`Distância vai de ${n * 3} a ${n * 9} em 3 s. Taxa média?`, 2 * n],
      (n) => [`f(x)=${n}x+2. Taxa média entre 1 e 4?`, n],
      (n) => [`f(x)=−${n}x. Taxa média entre 2 e 5?`, -n],
    ],
  ],
  calculus1: [
    [
      (n) => [`lim x→${n} (x² − 1)`, n * n - 1],
      (n) => [`lim x→${n} (x² − ${n * n})/(x − ${n})`, 2 * n],
      (n) => [`lim x→0 sen(${n}x)/x`, n],
      (n) => [`lim x→∞ (${n}x + 1)/(x + 3)`, n],
    ],
    [
      (n) => [`f(x)=${n}x+3. f′(2) = ?`, n],
      (n) => [`f(x)=${n}x². f′(1) = ?`, 2 * n],
      (n) => [`f(x)=${n}. f′(3) = ?`, 0],
      (n) => [`f(x)=x³. f′(${n}) = ?`, 3 * n * n],
    ],
    [
      (n) => [`f(x)=x^${n}. f′(1) = ?`, n],
      (n) => [`f(x)=x^${n}. f′(−1) = ?`, n * (-1) ** (n - 1)],
      (n) => [`f(x)=${n}x³. f′(2) = ?`, 12 * n],
      (n) => [`f(x)=x^${n + 1}. f′(0) = ?`, 0],
    ],
    [
      (n) => [`f(x)=x²+${n}x. f′(2) = ?`, 4 + n],
      (n) => [`f(x)=x³−${n}x. f′(1) = ?`, 3 - n],
      (n) => [`f(x)=${n}x²+${n + 1}. f′(2) = ?`, 4 * n],
      (n) => [`f(x)=2x³+${n}x². f′(1) = ?`, 6 + 2 * n],
    ],
    [
      (n) => [`Tangente a y=x² em x=${n}. Inclinação?`, 2 * n],
      (n) => [`Tangente a y=${n}x³ em x=1. Inclinação?`, 3 * n],
      (n) => [`Tangente a y=x² em x=${n}. Intercepto em y?`, -n * n],
      (n) => [`Tangente a y=${n}x+2 em x=3. Inclinação?`, n],
    ],
    [
      (n) => [`f(x)=(x−${n})²+3. x do mínimo?`, n],
      (n) => [`f(x)=−(x−${n})²+4. Valor máximo?`, 4],
      (n) => [`f(x)=x²−${2 * n}x. Ponto crítico x?`, n],
      (n) => [`f(x)=(x+${n})². x do mínimo?`, -n],
    ],
  ],
  calculus2: [
    [
      (n) => [`F′(x)=${2 * n}x, F(0)=3. F(2) = ?`, 4 * n + 3],
      (n) => [`F′(x)=${n}, F(1)=2. F(3) = ?`, 2 * n + 2],
      (n) => [`F′(x)=3x², F(0)=${n}. F(2) = ?`, 8 + n],
      (n) => [`F′(x)=2x+${n}, F(0)=0. F(1) = ?`, n + 1],
    ],
    [
      (n) => [`∫₁^${n + 1} 2x dx`, (n + 1) ** 2 - 1],
      (n) => [`∫₀^2 ${n} dx`, 2 * n],
      (n) => [`∫₀^${n} 3x² dx`, n ** 3],
      (n) => [`∫₂^0 ${n} dx`, -2 * n],
    ],
    [
      (n) => [`Área sob y=2x, de 0 a ${n}?`, n * n],
      (n) => [`Área entre y=${n + 2} e y=2, de 0 a 3?`, 3 * n],
      (n) => [`Área sob y=−${n}, de 0 a 2?`, 2 * n],
      (n) => [`Área sob y=x, de 0 a ${2 * n}?`, 2 * n * n],
    ],
    [
      (n) => [`∫₀^1 (${2 * n}x+4) dx`, n + 4],
      (n) => [`∫₀^2 (3x²+${n}) dx`, 8 + 2 * n],
      (n) => [`∫₀^1 (${3 * n}x²−2x) dx`, n - 1],
      (n) => [`∫₀^${n} (2x+1) dx`, n * n + n],
    ],
    [
      (n) => [`Girar y=${n}, 0≤x≤2, em torno de x. Volume/π?`, 2 * n * n],
      (n) => [`Girar y=x, 0≤x≤${3 * n}, em torno de x. Volume/π?`, 9 * n ** 3],
      (n) => [`Arruela: raio externo ${n + 1}, interno ${n}, comprimento 2. Volume/π?`, 4 * n + 2],
      (n) => [`Girar y=1, 0≤x≤${n + 3}. Volume/π?`, n + 3],
    ],
    [
      (n) => [`∫₀^${2 * n} x dx`, 2 * n * n],
      (n) => [`∫₁^${n + 1} 2x dx`, n * n + 2 * n],
      (n) => [`∫₀^2 (${n}x+1) dx`, 2 * n + 2],
      (n) => [`∫₀^1 (${2 * n}−2x) dx`, 2 * n - 1],
    ],
  ],
  calculus3: [
    [
      (n) => [`f(x,y)=x²+y. f(${n},2) = ?`, n * n + 2],
      (n) => [`f(x,y)=xy. f(${n},−2) = ?`, -2 * n],
      (n) => [`f(x,y)=x−y². f(${n + 4},2) = ?`, n],
      (n) => [`f(x,y)=2x+3y. f(${n},1) = ?`, 2 * n + 3],
    ],
    [
      (n) => [`f(x,y)=x²y. ∂f/∂x em (1,${n})?`, 2 * n],
      (n) => [`f(x,y)=${n}x+y². ∂f/∂y em (2,3)?`, 6],
      (n) => [`f(x,y)=xy+${n}x. ∂f/∂x em (1,2)?`, n + 2],
      (n) => [`f(x,y)=x³+y. ∂f/∂x em (${n},1)?`, 3 * n * n],
    ],
    [
      (n) => [`f(x,y)=x²+y². Componente x do gradiente em (${n},1)?`, 2 * n],
      (n) => [`f(x,y)=xy. Componente y do gradiente em (${n},2)?`, n],
      (n) => [`f(x,y)=3x+${n}y. Componente y do gradiente?`, n],
      (n) => [`f(x,y)=x²+2y². Componente y do gradiente em (1,${n})?`, 4 * n],
    ],
    [
      (n) => [`(${n},2,1) · (2,1,3)`, 2 * n + 5],
      (n) => [`(${n},1,0) · (1,−${n},2)`, 0],
      (n) => [`(${n},0,1) · (${n},2,−1)`, n * n - 1],
      (n) => [`(1,2,3) · (${n},${n},${n})`, 6 * n],
    ],
    [
      (n) => [`F=(${n}x,2y,3z). div F?`, n + 5],
      (n) => [`F=(x²,y²,z²). div F em (${n},1,1)?`, 2 * n + 4],
      (n) => [`F=(y,z,x). div F em (${n},1,2)?`, 0],
      (n) => [`F=(${n}x,−${n}y,z). div F?`, 1],
    ],
    [
      (n) => [`∫₀^${n} ∫₀^2 1 dy dx`, 2 * n],
      (n) => [`∫₀^2 ∫₀^${n} x dy dx`, 2 * n],
      (n) => [`∫₀^1 ∫₀^2 ${n}y dy dx`, 2 * n],
      (n) => [`Retângulo 0≤x≤${n}, 0≤y≤3. Integral dupla de 2?`, 6 * n],
    ],
  ],
};
export function bankQuestion(course: MathCourseId, level: number, index: number): MathBankQuestion {
  const format = Math.floor(index / 6);
  let [expression, answer] = FORMATS[course][level]![format]!((index % 6) + 2);
  let source = "Autoral OlenaStudy, quatro formatos com seis variantes fixas por etapa.";
  if (course === "calculus1" && level === 2 && index < 3) {
    const adaptation: Entry =
      index === 0
        ? ["f(x)=x^13. f′(1) = ?", 13]
        : index === 1
          ? ["f(x)=x^(−3/2). f′(1) = ?", -1.5]
          : ["f(x)=x^2,4. f′(1) = ?", 2.4];
    [expression, answer] = adaptation;
    source = `${THOMPSON_SOURCE} Adaptação do item ${[1, 2, 4][index]}: avaliar a derivada em 1; alternativas autorais.`;
  }
  const choices = [answer, answer + 1, answer - 1, answer + Math.max(2, Math.abs(answer) || 2)];
  // Rotação fixa evita que a resposta correta ocupe sempre a mesma posição.
  for (let i = 0; i < index % 4; i++) choices.push(choices.shift()!);
  return {
    id: `${course}:${level}:${index}`,
    revision: 1,
    format,
    source,
    expression,
    answer,
    choices,
    seed: level * 24 + index + 1,
    topic: MATH_COURSES.find((item) => item.id === course)!.topics[level]!,
    budget: expression.length > 55 ? 40 : 28,
    drain: 1,
  };
}
