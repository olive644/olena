/** Referências originais da OlenaStudy. Não são textos copiados de livros ou APIs. */
export type MathReference = {
  id: string;
  title: string;
  terms: readonly string[];
  content: string;
  checks: readonly { expression: string; exact: string }[];
};
export const MATH_KNOWLEDGE_VERSION = "2026-10-12.1";
export const MATH_REFERENCES: readonly MathReference[] = [
  {
    id: "operations",
    title: "Operações e ordem de cálculo",
    terms: [
      "adição",
      "soma",
      "somar",
      "subtração",
      "subtrair",
      "multiplicação",
      "multiplicar",
      "divisão",
      "dividir",
      "operações",
      "precedência",
      "parênteses",
    ],
    content:
      "Calcule primeiro os parênteses, depois potências, depois multiplicações e divisões da esquerda para a direita, e por fim adições e subtrações da esquerda para a direita. Exemplo: 2 + 3 × 4 = 2 + 12 = 14. Em 18 ÷ 3 × 2, faça 6 × 2 = 12. Dividir por zero não é definido. Na divisão exata, dividendo = divisor × quociente.",
    checks: [
      { expression: "2+3*4", exact: "14" },
      { expression: "18/3*2", exact: "12" },
    ],
  },
  {
    id: "signed-numbers",
    title: "Números negativos e sinais",
    terms: ["negativo", "negativos", "inteiros", "sinais", "regra de sinais"],
    content:
      "Na soma de números com sinais iguais, some os módulos e mantenha o sinal. Com sinais diferentes, subtraia os módulos e use o sinal do maior módulo. Subtrair um número é somar seu oposto: 5 - (-3) = 8. Multiplicação e divisão: sinais iguais dão positivo, diferentes dão negativo. Cuidado: -2² = -(2²) = -4, mas (-2)² = 4.",
    checks: [
      { expression: "5-(-3)", exact: "8" },
      { expression: "-2^2", exact: "-4" },
      { expression: "(-2)^2", exact: "4" },
    ],
  },
  {
    id: "fractions",
    title: "Frações e equivalência",
    terms: ["fração", "frações", "numerador", "denominador", "mmc", "simplificar fração"],
    content:
      "Uma fração a/b representa a divisão de a por b, com b diferente de zero. Multiplicar numerador e denominador pelo mesmo número não nulo mantém o valor. Para somar, use denominadores comuns: 1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2. Multiplique numeradores entre si e denominadores entre si. Para dividir, multiplique pelo inverso de uma fração não nula: (2/3) ÷ (4/5) = (2/3) × (5/4) = 5/6.",
    checks: [
      { expression: "1/3+1/6", exact: "1/2" },
      { expression: "(2/3)/(4/5)", exact: "5/6" },
    ],
  },
  {
    id: "decimals",
    title: "Decimais e valor posicional",
    terms: ["decimal", "decimais", "vírgula", "casas decimais", "décimos", "centésimos"],
    content:
      "Cada casa à direita da vírgula vale um décimo da anterior: 0,25 = 25/100 = 1/4. Alinhe as vírgulas para somar ou subtrair. Exemplo: 0,1 + 0,2 = 0,3 exatamente. Para multiplicar decimais, multiplique os inteiros correspondentes e recoloque o total de casas decimais. Resultados periódicos, como 1/3, devem conservar a fração exata e identificar a aproximação.",
    checks: [
      { expression: "0,1+0,2", exact: "3/10" },
      { expression: "0,25", exact: "1/4" },
    ],
  },
  {
    id: "percentages",
    title: "Porcentagem, descontos e aumentos",
    terms: ["porcentagem", "percentual", "por cento", "desconto", "aumento", "%"],
    content:
      "p% significa p/100. Para achar p% de um valor V, calcule V × p/100. Exemplo: 20% de 150 = 30. Um desconto de 20% em 150 dá 150 × 0,80 = 120. Um aumento de 20% dá 150 × 1,20 = 180. Variações sucessivas são multiplicativas: aumentar 10% e depois diminuir 10% transforma 100 em 100 × 1,10 × 0,90 = 99, não 100.",
    checks: [
      { expression: "20% de 150", exact: "30" },
      { expression: "150*0,80", exact: "120" },
      { expression: "100*1,10*0,90", exact: "99" },
    ],
  },
  {
    id: "proportions",
    title: "Razões, proporções e regra de três",
    terms: ["razão", "razões", "proporção", "proporções", "regra de três", "proporcional"],
    content:
      "Em uma proporção a/b = c/d, com denominadores não nulos, a × d = b × c. Primeiro verifique se as grandezas são diretamente ou inversamente proporcionais. Se 3 cadernos custam 15 reais e o preço unitário é constante, 5 cadernos custam 25 reais. Em uma tarefa fixa e com produtividade igual, dobrar o número de trabalhadores divide o tempo pela metade. Não use regra de três quando não houver proporcionalidade.",
    checks: [
      { expression: "3/15=5/x", exact: "unsupported" },
      { expression: "3*x=15*5", exact: "x = 25" },
    ],
  },
  {
    id: "powers",
    title: "Potências e raízes",
    terms: ["potência", "potências", "expoente", "expoentes", "raiz", "raízes", "radiciação"],
    content:
      "Para expoentes inteiros, a^m × a^n = a^(m+n); se a não for zero, a^m / a^n = a^(m-n). Também (a^m)^n = a^(m×n). Com a não nulo, a^0 = 1 e a^(-n) = 1/a^n. A raiz quadrada principal é não negativa: √25 = 5. Resolver x² = 25 dá x = 5 ou x = -5, diferente de calcular √25. Não some expoentes em uma adição de potências.",
    checks: [
      { expression: "2^3*2^2", exact: "32" },
      { expression: "2^-3", exact: "1/8" },
    ],
  },
  {
    id: "linear-equations",
    title: "Equações de primeiro grau",
    terms: ["equação", "equações", "primeiro grau", "isolar x", "incógnita", "linear"],
    content:
      "Uma equação mantém a igualdade quando a mesma operação válida é feita nos dois lados. Em 2x + 3 = 11, subtraia 3 nos dois lados: 2x = 8. Divida ambos por 2: x = 4. Confira substituindo: 2 × 4 + 3 = 11. Em ax = b: se a não for zero, x = b/a; se a = 0 e b = 0, todos os valores satisfazem; se a = 0 e b diferente de zero, não há solução. Não divida por uma expressão que possa ser zero sem analisar o domínio.",
    checks: [
      { expression: "2x+3=11", exact: "x = 4" },
      { expression: "x+1=x+1", exact: "infinitas soluções" },
      { expression: "x+1=x+2", exact: "sem solução" },
    ],
  },
  {
    id: "quadratic-equations",
    title: "Equações de segundo grau e Bhaskara",
    terms: ["segundo grau", "quadrática", "quadráticas", "bhaskara", "discriminante", "delta"],
    content:
      "Na equação ax² + bx + c = 0, a deve ser diferente de zero. Calcule Δ = b² - 4ac e use x = (-b ± √Δ)/(2a). No conjunto dos reais: Δ positivo dá duas raízes distintas, Δ zero dá uma raiz dupla, Δ negativo não dá raízes reais. Exemplo: x² - 5x + 6 = 0 tem Δ = 25 - 24 = 1 e raízes (5 ± 1)/2, isto é, 3 e 2. Confira as raízes na equação original.",
    checks: [
      { expression: "(-5)^2-4*1*6", exact: "1" },
      { expression: "3^2-5*3+6", exact: "0" },
      { expression: "2^2-5*2+6", exact: "0" },
    ],
  },
  {
    id: "functions",
    title: "Funções afins e quadráticas",
    terms: [
      "função",
      "funções",
      "função afim",
      "função quadrática",
      "gráfico",
      "coeficiente angular",
    ],
    content:
      "Uma função associa a cada entrada do domínio exatamente uma saída. Em f(x) = ax + b, a é a inclinação e b é o valor em x = 0. Exemplo: f(x) = 2x + 3, então f(4) = 11. Em f(x) = ax² + bx + c, a não nulo, o gráfico é uma parábola; a positivo abre para cima, a negativo para baixo. A abscissa do vértice é -b/(2a). Respeite o domínio, especialmente em divisões e raízes.",
    checks: [{ expression: "2*4+3", exact: "11" }],
  },
  {
    id: "sequences",
    title: "Progressões aritméticas e geométricas",
    terms: [
      "sequência",
      "sequências",
      "progressão",
      "progressões",
      "pa",
      "pg",
      "razão da progressão",
    ],
    content:
      "Na PA, a diferença entre termos consecutivos é constante: a_n = a_1 + (n-1)r. A soma dos n primeiros termos é n(a_1+a_n)/2. Exemplo: 2, 5, 8 tem razão 3 e quinto termo 14. Na PG, cada termo é o anterior multiplicado por q: a_n = a_1 × q^(n-1). A soma finita para q diferente de 1 é a_1(q^n-1)/(q-1); para q = 1, é n × a_1.",
    checks: [
      { expression: "2+(5-1)*3", exact: "14" },
      { expression: "2*3^(4-1)", exact: "54" },
    ],
  },
  {
    id: "plane-geometry",
    title: "Áreas, perímetros e unidades",
    terms: [
      "área",
      "áreas",
      "perímetro",
      "geometria",
      "retângulo",
      "triângulo",
      "círculo",
      "circunferência",
    ],
    content:
      "Perímetro é o comprimento do contorno, medido em unidades de comprimento; área mede a superfície, em unidades quadradas. Retângulo: área = base × altura e perímetro = 2(base+altura). Triângulo: área = base × altura perpendicular / 2. Círculo: área = πr² e comprimento da circunferência = 2πr. Use medidas na mesma unidade. Um retângulo de 3 cm por 4 cm tem área 12 cm² e perímetro 14 cm.",
    checks: [
      { expression: "3*4", exact: "12" },
      { expression: "2*(3+4)", exact: "14" },
    ],
  },
  {
    id: "pythagoras",
    title: "Teorema de Pitágoras",
    terms: ["pitágoras", "hipotenusa", "cateto", "catetos", "triângulo retângulo"],
    content:
      "Em um triângulo retângulo, a hipotenusa c é o lado oposto ao ângulo reto e satisfaz c² = a² + b², onde a e b são os catetos. Com catetos 3 e 4: c² = 9 + 16 = 25 e c = 5, pois comprimento é positivo. Para encontrar um cateto, subtraia os quadrados: a² = c² - b². O teorema não vale dessa forma para qualquer triângulo.",
    checks: [
      { expression: "3^2+4^2", exact: "25" },
      { expression: "5^2-4^2", exact: "9" },
    ],
  },
  {
    id: "probability",
    title: "Probabilidade em espaços equiprováveis",
    terms: [
      "probabilidade",
      "chance",
      "evento aleatório",
      "dado justo",
      "lançamento de dados",
      "equiprováveis",
    ],
    content:
      "Quando todos os resultados elementares são igualmente prováveis, P(evento) = casos favoráveis / casos possíveis. Um dado justo de seis faces tem probabilidade 3/6 = 1/2 de sair par. A probabilidade vai de 0 a 1, e P(não A) = 1 - P(A). Para eventos independentes, P(A e B) = P(A) × P(B). Não suponha independência ou resultados igualmente prováveis sem evidência; retirar sem reposição costuma mudar a próxima probabilidade.",
    checks: [
      { expression: "3/6", exact: "1/2" },
      { expression: "(1/2)*(1/2)", exact: "1/4" },
    ],
  },
  {
    id: "statistics",
    title: "Média, mediana e moda",
    terms: ["estatística", "média", "mediana", "moda", "média ponderada"],
    content:
      "Média aritmética é a soma dos valores dividida pela quantidade. Média ponderada é a soma de valor × peso dividida pela soma dos pesos, com soma não nula. Mediana exige ordenar: com quantidade ímpar, é o termo central; com quantidade par, é a média dos dois centrais. Moda é o valor mais frequente; pode haver várias ou nenhuma moda segundo a convenção escolar. Em 2, 3, 3, 8: média 4, mediana 3, moda 3.",
    checks: [
      { expression: "(2+3+3+8)/4", exact: "4" },
      { expression: "(3+3)/2", exact: "3" },
    ],
  },
  {
    id: "logarithms",
    title: "Logaritmos e suas condições",
    terms: ["logaritmo", "logaritmos", "log", "logarítmica"],
    content:
      "Nos reais, log_a(b) = c significa a^c = b, com a > 0, a diferente de 1 e b > 0. Exemplo: log_2(8) = 3 porque 2³ = 8. Para argumentos positivos: log_a(uv) = log_a(u)+log_a(v), log_a(u/v) = log_a(u)-log_a(v). Não existe regra que distribua logaritmo sobre soma. A mudança de base é log_a(b) = log_c(b)/log_c(a), com bases válidas.",
    checks: [{ expression: "2^3", exact: "8" }],
  },
  {
    id: "trigonometry",
    title: "Trigonometria no triângulo retângulo",
    terms: ["trigonometria", "seno", "cosseno", "tangente", "sen", "cos", "tan"],
    content:
      "Para um ângulo agudo de triângulo retângulo: seno = cateto oposto / hipotenusa, cosseno = cateto adjacente / hipotenusa, tangente = oposto / adjacente. A identificação dos catetos depende do ângulo escolhido. sen²(θ)+cos²(θ)=1. Valores notáveis: sen(30°)=1/2, cos(60°)=1/2, sen(90°)=1 e cos(0°)=1. Identifique se o ângulo está em graus ou radianos antes de calcular.",
    checks: [
      { expression: "3/5", exact: "3/5" },
      { expression: "(3/5)^2+(4/5)^2", exact: "1" },
    ],
  },
];
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
/** Busca lexical limitada ao pedido atual. Não interpreta fontes do aluno como conteúdo confiável. */
export function retrieveMathReferences(prompt: string): readonly MathReference[] {
  const query = normalize(prompt).slice(0, 2000);
  const words = new Set(query.match(/[a-z0-9]+/g));
  const ranked = MATH_REFERENCES.map((reference) => ({
    reference,
    score: reference.terms.reduce((score, term) => {
      const normalized = normalize(term);
      const match = normalized.includes(" ")
        ? ` ${query.replace(/[^a-z0-9]+/g, " ")} `.includes(` ${normalized} `)
        : normalized === "%"
          ? query.includes("%")
          : words.has(normalized);
      return score + (match ? normalized.split(" ").length * 2 : 0);
    }, 0),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.reference.id.localeCompare(b.reference.id));
  return ranked.slice(0, 3).map((item) => item.reference);
}
