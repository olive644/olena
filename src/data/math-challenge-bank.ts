import { MATH_COURSES, type MathCourseId } from "./math-courses.js";
import { bankQuestion } from "./math-game-bank.js";
import { choiceBounds, originalChoiceErrors } from "./math-choice-errors.js";
import { type MathChallenge } from "../domain/adaptive-math.js";

// Novos formatos autorais, avaliados em seis variantes fixas (n=2..7).
// Os erros propostos são candidatos: igualdade com o gabarito e colisões são filtradas.
type Entry = readonly [prompt: string, answer: number, wrong: readonly number[], review: string];
type Format = (n: number) => Entry;
export type QualityQuestion = MathChallenge & {
  id: string;
  revision: 3;
  format: number;
  source: string;
  difficulty: number;
  review: string;
};
const EXTRA: Record<MathCourseId, readonly (readonly Format[])[]> = {
  foundations: [
    [
      (n) => [
        `${n + 10} + ${n + 9} = ${2 * n + 18}. Quanto falta nessa resposta?`,
        1,
        [2, 10, 2 * n + 18],
        "Some as parcelas e compare com a resposta apresentada.",
      ],
      (n) => [
        `${n + 8} pontos na primeira fase e ${n + 12} na segunda. Quantos acima de 20?`,
        2 * n,
        [20, 2 * n + 20, 4 * n],
        "Some os pontos antes de descontar a meta de 20.",
      ],
      (n) => [
        `Troque ? para equilibrar: ${n + 6}+${n + 4} = ?+${n + 2}`,
        n + 8,
        [2 * n + 10, n + 2, 3 * n + 12],
        "Os dois lados precisam ter o mesmo total.",
      ],
      (n) => [
        `${n + 5} + (${n + 7} + ${n + 3}). Qual a soma, sem mudar a ordem?`,
        3 * n + 15,
        [2 * n + 12, (n + 5) * (n + 10), 3 * n + 5],
        "Parênteses agrupam parcelas, não indicam multiplicação.",
      ],
    ],
    [
      (n) => [
        `${10 * n} pontos, perde ${2 * n} e recupera ${n}. Saldo?`,
        9 * n,
        [7 * n, 11 * n, 10 * n],
        "Perda subtrai, recuperação soma.",
      ],
      (n) => [
        `? − ${n + 7} = ${2 * n + 5}. Qual número entrou?`,
        3 * n + 12,
        [n - 2, 2 * n + 5, 3 * n + 5],
        "Desfaça a subtração somando o que foi retirado.",
      ],
      (n) => [
        `${10 * n + 2} − ${n + 5}. Resultado?`,
        9 * n - 3,
        [9 * n + 3, 11 * n + 7, 9 * n + 7],
        "Faça o reagrupamento das dezenas antes das unidades.",
      ],
      (n) => [
        `Meta ${5 * n}. Você tem ${n + 3} e ganha ${n}. Quanto falta?`,
        3 * n - 3,
        [4 * n - 3, 3 * n + 3, 7 * n + 3],
        "Desconte da meta tudo o que já foi obtido.",
      ],
    ],
    [
      (n) => [
        `${n}×(${n + 4}) = ${n}×${n} + ?. Complete.`,
        4 * n,
        [4, n * n, n + 4],
        "Distribua o fator pelos dois termos.",
      ],
      (n) => [
        `${n + 3} fileiras de ${n + 2} lugares. Uma fileira fechou. Quantos livres?`,
        (n + 2) ** 2,
        [(n + 3) * (n + 2) - 1, (n + 3) * (n + 2), 2 * n + 4],
        "Retire uma fileira inteira, não apenas um lugar.",
      ],
      (n) => [
        `Uma caixa tem ${n + 2} pacotes com 3 peças. Quantas peças em ${n} caixas?`,
        3 * n * (n + 2),
        [3 * n + n + 2, n * (n + 2), 3 * (n + 2)],
        "Multiplique os três fatores: caixas, pacotes e peças.",
      ],
      (n) => [
        `Produto ${n}×${n + 4}. Se o segundo fator aumenta 2, quanto cresce?`,
        2 * n,
        [2, n + 2, n * (n + 6)],
        "A variação do produto é o primeiro fator vezes a variação do segundo.",
      ],
    ],
    [
      (n) => [
        `${5 * n + 2} peças. Caixas de 5. Quantas peças sobram?`,
        2,
        [n, 5, n + 2],
        "O resto fica depois de formar todas as caixas completas.",
      ],
      (n) => [
        `${4 * n + 1} pessoas. Carros de 4 lugares. Mínimo de carros?`,
        n + 1,
        [n, 4, n + 4],
        "O resto exige mais um carro.",
      ],
      (n) => [
        `Dividendo ${n * (n + 3) + 2}, divisor ${n + 3}, resto 2. Quociente?`,
        n,
        [n + 2, n + 3, n * (n + 3)],
        "Dividendo = divisor vezes quociente mais resto.",
      ],
      (n) => [
        `${n * 12} moedas em 3 grupos; cada grupo repartido entre 4 pessoas. Cada pessoa?`,
        n,
        [4 * n, 3 * n, 12 * n],
        "As duas divisões equivalem a dividir por 12.",
      ],
    ],
    [
      (n) => [
        `${n} de ${4 * n} peças pintadas. Que porcentagem foi pintada?`,
        25,
        [75, 4, 100],
        "A fração simplifica para um quarto.",
      ],
      (n) => [
        `Metade de ${8 * n}, depois metade de novo. Quantidade?`,
        2 * n,
        [4 * n, 8 * n, 6 * n],
        "Metade da metade é um quarto, não zero.",
      ],
      (n) => [
        `Um terço de um lote é ${2 * n}. Qual o lote inteiro?`,
        6 * n,
        [2 * n, 3 * n, 4 * n],
        "Reconstitua o inteiro multiplicando a parte por três.",
      ],
      (n) => [
        `Receita usa 3/4 de ${8 * n} mL. Faça metade da receita. Quantos mL?`,
        3 * n,
        [6 * n, 4 * n, 2 * n],
        "Primeiro calcule três quartos, depois tome a metade.",
      ],
    ],
    [
      (n) => [
        `Preço R$ ${100 * n}. Descontos sucessivos de 10% e 20%. Preço final?`,
        72 * n,
        [70 * n, 80 * n, 90 * n],
        "O segundo desconto incide sobre o preço já reduzido.",
      ],
      (n) => [
        `Após aumento de 25%, preço virou R$ ${25 * n}. Preço anterior?`,
        20 * n,
        [18.75 * n, 25 * n, 5 * n],
        "O novo preço é 125% do antigo; divida por 1,25.",
      ],
      (n) => [
        `De ${10 * n} para ${12 * n}. Aumento em porcentagem?`,
        20,
        [2, 120, 25],
        "Divida o aumento pelo valor inicial, não pelo final.",
      ],
      (n) => [
        `Produto de R$ ${20 * n}: desconto de 25% ou R$ ${4 * n}. Economia da melhor opção?`,
        5 * n,
        [4 * n, n, 15 * n],
        "Compare os descontos em reais; a pergunta pede a economia.",
      ],
    ],
  ],
  school: [
    [
      (n) => [
        `${n}(x−2) = ${3 * n}. x = ?`,
        5,
        [3, 1, 3 * n + 2],
        "Divida pelo coeficiente antes de somar 2.",
      ],
      (n) => [
        `${n}x+4 = ${n - 1}x+${n + 7}. x = ?`,
        n + 3,
        [n + 7, 4, 2 * n + 3],
        "Reúna os termos em x de um lado e as constantes do outro.",
      ],
      (n) => [
        `x/${n} − 2 = 3. x = ?`,
        5 * n,
        [5, n, 3 * n - 2],
        "Some 2 antes de multiplicar pelo denominador.",
      ],
      (n) => [
        `−2x + ${n + 8} = ${n}. x = ?`,
        4,
        [-4, 8, n + 4],
        "O sinal negativo do coeficiente também participa da divisão.",
      ],
    ],
    [
      (n) => [
        `(${n}+1)² − ${n}²`,
        2 * n + 1,
        [1, 2 * n, n * n + 1],
        "O quadrado da soma inclui o termo cruzado.",
      ],
      (n) => [
        `(−${n})² − ${n}²`,
        0,
        [-2 * n * n, 2 * n * n, -n * n],
        "Os parênteses fazem o sinal negativo pertencer à base.",
      ],
      (n) => [
        `2^${n + 2} ÷ 2^${n}. Resultado?`,
        4,
        [2, 2 * n + 2, 2 ** (2 * n + 2)],
        "Na divisão de mesma base, subtraia os expoentes.",
      ],
      (n) => [
        `${n}⁰ + ${n}¹. Resultado?`,
        n + 1,
        [n, 1, 2 * n],
        "Uma base não nula elevada a zero vale um.",
      ],
    ],
    [
      (n) => [
        `f(x)=3x+${n}. Se f(x)=${n + 12}, qual x?`,
        4,
        [12, n + 4, 3 * n + 12],
        "Resolva a equação, não substitua a imagem como argumento.",
      ],
      (n) => [
        `f(x)=−${n}x+10. Quanto f(x) muda quando x aumenta 2?`,
        -2 * n,
        [2 * n, -n, 10 - 2 * n],
        "A variação é o coeficiente angular vezes a variação de x.",
      ],
      (n) => [`f(x)=${n}x+3. Qual a raiz?`, -3 / n, [3 / n, 3, -n], "Na raiz a imagem é zero."],
      (n) => [
        `A cobra R$ ${2 * n} + R$ 2/km. B cobra R$ 3/km. Distância de empate?`,
        2 * n,
        [n, 3 * n, 6 * n],
        "Iguale os dois preços, não some as tarifas.",
      ],
    ],
    [
      (n) => [
        `Quadrado de lado ${n}. Dobre o lado. Nova área?`,
        4 * n * n,
        [2 * n * n, 4 * n, 2 * n],
        "Dobrar ambas as dimensões quadruplica a área.",
      ],
      (n) => [
        `Triângulo: área ${3 * n}, base ${2 * n}. Altura?`,
        3,
        [6, 1.5, 3 * n],
        "Use altura = duas vezes área dividida pela base.",
      ],
      (n) => [
        `Caixa de ${n}×3×4. Volume?`,
        12 * n,
        [n + 7, 6 * n, 7 * n],
        "Volume usa as três dimensões, não o perímetro.",
      ],
      (n) => [
        `Retângulo ${n}×${n + 4}. Aumente só a largura em 2. Aumento da área?`,
        2 * n,
        [4, 2 * n + 8, n * (n + 6)],
        "A faixa nova tem altura n e largura 2.",
      ],
    ],
    [
      (n) => [
        `PA: ${n}, ${n + 4}, ${n + 8}. Qual a razão?`,
        4,
        [n, 8, n + 4],
        "A razão é a diferença entre termos consecutivos.",
      ],
      (n) => [
        `PG: ${n}, ${3 * n}, ${9 * n}. Qual a razão?`,
        3,
        [2 * n, 6 * n, 9],
        "A razão geométrica é um quociente, não uma diferença.",
      ],
      (n) => [
        `PA de primeiro termo ${n} e razão 2. Soma dos 4 primeiros?`,
        4 * n + 12,
        [4 * n + 8, n + 6, 4 * n + 6],
        "Some os quatro termos, ou use média dos extremos vezes quatro.",
      ],
      (n) => [
        `Sequência a(k)=${n}k+1. Diferença a(5)−a(2)?`,
        3 * n,
        [3, 7 * n + 2, 3 * n + 1],
        "A constante se cancela na diferença.",
      ],
    ],
    [
      (n) => [
        `${n} azuis e ${n} verdes. Duas retiradas com reposição. Chance de duas azuis em %?`,
        25,
        [50, 100, 0],
        "Com reposição, multiplique as probabilidades independentes.",
      ],
      (n) => [
        `${n} azuis e ${3 * n} verdes. Chance de não sair azul em %?`,
        75,
        [25, 3, 100],
        "O complemento é 100% menos a chance de azul.",
      ],
      (n) => [
        `${n} moedas justas. Chance de a primeira dar cara em %?`,
        50,
        [100 / n, 25, 100],
        "O número total de moedas não altera a primeira moeda.",
      ],
      (n) => [
        `${2 * n} bilhetes entre ${10 * n}. Chance de ganhar um sorteio, em %?`,
        20,
        [2, 80, 5],
        "Divida os bilhetes favoráveis pelo total e multiplique por 100.",
      ],
    ],
  ],
  advanced: [
    [
      (n) => [
        `f(x)=x². f(−${n}) − f(${n}) = ?`,
        0,
        [-2 * n * n, 2 * n * n, -n * n],
        "A função quadrática é par.",
      ],
      (n) => [
        `f(x)=|x−${n}|. Menor valor de f?`,
        0,
        [n, -n, n * n],
        "Valor absoluto nunca é negativo e pode ser zero.",
      ],
      (n) => [
        `f(x)=2/(x−${n}). Qual x fica fora do domínio?`,
        n,
        [0, -n, 2],
        "O denominador não pode ser zero.",
      ],
      (n) => [
        `f(x)=3x−${n}. f⁻¹(${n + 6}) = ?`,
        (2 * n + 6) / 3,
        [6, (n + 6) / 3, 3 * (n + 6) - n],
        "Desfaça primeiro a subtração e depois a multiplicação.",
      ],
    ],
    [
      (n) => [
        `log₂(${2 ** n} × 8)`,
        n + 3,
        [3 * n, 2 ** n + 8, n + 8],
        "Logaritmo de produto soma os logaritmos.",
      ],
      (n) => [
        `log₂(${2 ** (n + 2)} ÷ 4)`,
        n,
        [n + 4, 2 * n, 2 ** n],
        "Logaritmo de quociente subtrai os logaritmos.",
      ],
      (n) => [
        `log₃(x)=${n}. x = ?`,
        3 ** n,
        [3 * n, n ** 3, n],
        "Reescreva a definição na forma exponencial.",
      ],
      (n) => [`log₂(1/${2 ** n})`, -n, [n, 1 / n, 0], "O recíproco equivale a expoente negativo."],
    ],
    [
      (n) => [
        `${n}·(sen²(20°)+cos²(20°))`,
        n,
        [0, 2 * n, n * n],
        "A soma dos quadrados de seno e cosseno vale um.",
      ],
      (n) => [
        `${2 * n} cos(60°) − ${n} sen(90°)`,
        0,
        [n, 2 * n, -n],
        "Use cos 60° = 1/2 e sen 90° = 1.",
      ],
      (n) => [
        `${n} cos(360°) + ${n} cos(180°)`,
        0,
        [2 * n, n, -2 * n],
        "Os cossenos são um e menos um.",
      ],
      (n) => [
        `${n} tan(0°) + ${2 * n} sen(30°)`,
        n,
        [0, 2 * n, 3 * n],
        "Tangente de zero é zero; seno de 30° é meio.",
      ],
    ],
    [
      (n) => [
        `u=(${n},2), v=(2,−${n}). u·v = ?`,
        0,
        [4 * n, 2 * n, n * n + 4],
        "Vetores perpendiculares têm produto escalar zero.",
      ],
      (n) => [
        `Vetor (${n},−${n}). Quadrado do comprimento?`,
        2 * n * n,
        [0, 2 * n, n * n],
        "Some os quadrados; não some as coordenadas antes de elevar.",
      ],
      (n) => [
        `u=(${n},3). Componente y de 2u?`,
        6,
        [3, 2 * n, n + 6],
        "O escalar multiplica cada componente.",
      ],
      (n) => [
        `A=(${n},2), B=(${n + 5},2). Distância AB?`,
        5,
        [n + 5, 25, 0],
        "Coordenadas y iguais deixam apenas a diferença horizontal.",
      ],
    ],
    [
      (n) => [
        `f(x)=x², g(x)=x+${n}. g(f(2)) = ?`,
        n + 4,
        [(n + 2) ** 2, 2 * n + 4, n * n + 4],
        "g depois de f não é o mesmo que f depois de g.",
      ],
      (n) => [
        `f(x)=2x, g(x)=x+${n}. f(g(1))−g(f(1)) = ?`,
        n,
        [0, 2 * n, 2 + n],
        "Calcule as duas composições na ordem indicada.",
      ],
      (n) => [
        `f(x)=x+${n}, g(x)=x−${n}. f(g(${n + 3})) = ?`,
        n + 3,
        [3, 3 * n + 3, -n + 3],
        "Estas funções são inversas, os deslocamentos se cancelam.",
      ],
      (n) => [
        `f(x)=${n}x, g(x)=x². f(g(2)) = ?`,
        4 * n,
        [4 * n * n, 2 * n, 2 * n * n],
        "Aplique g ao argumento antes de multiplicar por n.",
      ],
    ],
    [
      (n) => [
        `f(x)=x². Taxa média entre −${n} e ${n}?`,
        0,
        [2 * n, -2 * n, n * n],
        "As imagens dos extremos são iguais.",
      ],
      (n) => [
        `f(x)=${n}x+4. Taxa média entre 2 e 7?`,
        n,
        [5 * n, n + 4, 4],
        "Divida a variação da imagem pela variação do argumento.",
      ],
      (n) => [
        `Temperatura cai ${3 * n} graus em 3 horas. Taxa por hora?`,
        -n,
        [n, -3 * n, 3 * n],
        "A queda tem variação negativa.",
      ],
      (n) => [
        `s(t)=${n}t². Velocidade média entre t=1 e t=3?`,
        4 * n,
        [8 * n, 3 * n, 2 * n],
        "Use a diferença das posições dividida pelo intervalo de tempo.",
      ],
    ],
  ],
  calculus1: [
    [
      (n) => [
        `lim x→${n} (x²−${n * n})/(x−${n})`,
        2 * n,
        [0, n, n * n],
        "Fatore a diferença de quadrados antes de avaliar.",
      ],
      (n) => [
        `lim x→0 (1−cos(${n}x))/x`,
        0,
        [n, n * n, 1],
        "O numerador é de ordem quadrática perto de zero.",
      ],
      (n) => [
        `lim x→∞ (${n}x²+1)/(2x²+3)`,
        n / 2,
        [n, 2 / n, 0],
        "Compare os coeficientes dos termos de maior grau.",
      ],
      (n) => [
        `lim x→0 sen(${2 * n}x)/(${n}x)`,
        2,
        [n, 2 * n, 1],
        "Normalize pelo argumento do seno, em radianos.",
      ],
    ],
    [
      (n) => [
        `s(t)=${n}t². Velocidade instantânea em t=3?`,
        6 * n,
        [9 * n, 3 * n, 2 * n],
        "Velocidade instantânea é a derivada da posição.",
      ],
      (n) => [
        `f(x)=${n}/x. f′(1) = ?`,
        -n,
        [n, 0, 1 / n],
        "Escreva x com expoente menos um antes de derivar.",
      ],
      (n) => [
        `f(x)=sen(x)+${n}. f′(0) = ?`,
        1,
        [n, 0, n + 1],
        "A constante desaparece e a derivada do seno é cosseno.",
      ],
      (n) => [
        `f(x)=e^x+${n}x. f′(0) = ?`,
        n + 1,
        [n, 1, 0],
        "A derivada da exponencial é ela mesma.",
      ],
    ],
    [
      (n) => [
        `f(x)=x^${n + 2}. f′(2) = ?`,
        (n + 2) * 2 ** (n + 1),
        [n + 2, 2 ** (n + 2), (n + 1) * 2 ** (n + 2)],
        "O expoente multiplica e depois diminui um.",
      ],
      (n) => [
        `f(x)=x^(−${n}). f′(1) = ?`,
        -n,
        [n, -n - 1, 0],
        "Conserve o sinal do expoente negativo ao multiplicar.",
      ],
      (n) => [
        `f(x)=${n}√x. f′(1) = ?`,
        n / 2,
        [2 * n, n, 0],
        "Raiz quadrada equivale ao expoente um meio.",
      ],
      (n) => [
        `f(x)=(${n}x+1)². f′(0) = ?`,
        2 * n,
        [2, n * n, n],
        "Além da potência, multiplique pela derivada interna.",
      ],
    ],
    [
      (n) => [
        `f(x)=x²−${n}x+7. f′(2) = ?`,
        4 - n,
        [4 + n, 11 - n, 2 - n],
        "Derive cada parcela e preserve o sinal da subtração.",
      ],
      (n) => [
        `f(x)=${n}x²+3x+${n}. f′(0) = ?`,
        3,
        [n + 3, n, 0],
        "No zero, o termo derivado de x² se anula.",
      ],
      (n) => [
        `f(x)=(${n}x+2)+(3x−1). f′(5) = ?`,
        n + 3,
        [5 * (n + 3), n + 1, 1],
        "A derivada de uma função afim é o coeficiente de x.",
      ],
      (n) => [
        `f(x)=x³−${n}x². f′(1) = ?`,
        3 - 2 * n,
        [3 - n, 3 + 2 * n, 1 - n],
        "O termo quadrático também ganha o fator dois.",
      ],
    ],
    [
      (n) => [
        `Tangente a y=x² em x=${n}. Valor de y nessa tangente quando x=0?`,
        -n * n,
        [n * n, 2 * n, 0],
        "Use y−f(a)=f′(a)(x−a), não apenas a inclinação.",
      ],
      (n) => [
        `y=${n}x². Tangente horizontal em qual x?`,
        0,
        [n, 2 * n, -n],
        "Tangente horizontal exige derivada zero.",
      ],
      (n) => [
        `f(x)=${n}x+2. Tangente em x=1, avaliada em x=3?`,
        3 * n + 2,
        [n, 3 * n, n + 2],
        "Uma reta é sua própria tangente.",
      ],
      (n) => [
        `f′(${n})=4. Estime f(${n}+0,5)−f(${n}) pela tangente.`,
        2,
        [4, 0.5, 8],
        "A aproximação linear multiplica derivada e deslocamento.",
      ],
    ],
    [
      (n) => [
        `f(x)=(x−${n})²+${n + 2}. Valor mínimo?`,
        n + 2,
        [n, 0, -n],
        "O termo quadrático mínimo é zero, mas resta a constante.",
      ],
      (n) => [
        `f(x)=−x²+${2 * n}x. x do máximo?`,
        n,
        [-n, 2 * n, n * n],
        "Resolva a derivada zero e observe a concavidade negativa.",
      ],
      (n) => [
        `f(x)=x² em [−${n},${n + 1}]. Valor máximo?`,
        (n + 1) ** 2,
        [n * n, 0, n + 1],
        "Em intervalo fechado, compare também os extremos.",
      ],
      (n) => [
        `f(x)=(x+${n})²+1. x do mínimo?`,
        -n,
        [n, 1, n * n + 1],
        "Anule o conteúdo do quadrado, não a constante final.",
      ],
    ],
  ],
  calculus2: [
    [
      (n) => [
        `F′(x)=2x, F(1)=${n}. F(2) = ?`,
        n + 3,
        [n + 4, 4, n + 2],
        "A condição inicial determina a constante da primitiva.",
      ],
      (n) => [
        `F′(x)=${n}, F(2)=0. F(0) = ?`,
        -2 * n,
        [2 * n, 0, n],
        "Recue duas unidades com taxa constante.",
      ],
      (n) => [
        `F′(x)=3x², F(1)=0. F(${n}) = ?`,
        n ** 3 - 1,
        [n ** 3, 3 * n * n, n * n - 1],
        "Integre e ajuste a constante para que F(1)=0.",
      ],
      (n) => [
        `F′(x)=2x+${n}. Quanto vale F(2)−F(0)?`,
        4 + 2 * n,
        [4 + n, 2 + n, 2 * n],
        "A constante de integração cancela na diferença.",
      ],
    ],
    [
      (n) => [
        `∫₀^${n} 2 dx + ∫_${n}^${n + 2} 2 dx`,
        2 * n + 4,
        [4 * n, 2 * n + 2, 4],
        "Intervalos adjacentes podem ser unidos.",
      ],
      (n) => [
        `∫_${n}^${n} (x²+1) dx`,
        0,
        [n * n + 1, n, n ** 3 / 3 + n],
        "Limites iguais definem intervalo de comprimento zero.",
      ],
      (n) => [
        `∫_${n}^0 2x dx`,
        -n * n,
        [n * n, 2 * n, -2 * n],
        "Inverter os limites troca o sinal da integral.",
      ],
      (n) => [
        `∫_−${n}^${n} x³ dx`,
        0,
        [2 * n ** 4, n ** 4 / 4, -(n ** 4) / 4],
        "Função ímpar integrada em intervalo simétrico cancela.",
      ],
    ],
    [
      (n) => [
        `Área entre y=${n + 4} e y=${n}, de x=1 a x=3?`,
        8,
        [2 * (n + 4), 4, 2 * n],
        "Integre a diferença entre as curvas.",
      ],
      (n) => [
        `y=x entre −${n} e ${n}. Área geométrica total?`,
        n * n,
        [0, 2 * n * n, (n * n) / 2],
        "As duas áreas positivas somam, mesmo que a integral assinada seja zero.",
      ],
      (n) => [
        `Área sob y=${n}x entre 0 e 2?`,
        2 * n,
        [4 * n, n, 2],
        "A região é um triângulo de base dois e altura 2n.",
      ],
      (n) => [
        `Área de um retângulo sob y=${n}, entre x=2 e x=5?`,
        3 * n,
        [5 * n, 2 * n, 7 * n],
        "Use a largura do intervalo, não o limite superior.",
      ],
    ],
    [
      (n) => [
        `∫₀^1 (${n}x²+3) dx`,
        n / 3 + 3,
        [n + 3, n / 2 + 3, n / 3],
        "A primitiva de x² divide por três, e a constante também é integrada.",
      ],
      (n) => [
        `∫₀^2 (${n}x−1) dx`,
        2 * n - 2,
        [2 * n - 1, 4 * n - 2, n - 2],
        "Integre as parcelas antes de avaliar os limites.",
      ],
      (n) => [
        `∫₀^1 ${4 * n}x³ dx`,
        n,
        [4 * n, 2 * n, n / 4],
        "A potência integrada aumenta um e divide pelo novo expoente.",
      ],
      (n) => [
        `∫₀^${n} (2x+2) dx`,
        n * n + 2 * n,
        [2 * n * n + 2 * n, n * n + 2, n * n],
        "Some as duas primitivas avaliadas no limite superior.",
      ],
    ],
    [
      (n) => [
        `Cilindro: raio ${n}, altura 3. Volume dividido por π?`,
        3 * n * n,
        [3 * n, 9 * n * n, n * n],
        "O raio é elevado ao quadrado, a altura não.",
      ],
      (n) => [
        `Girar y=2x, 0≤x≤${n}, em torno de x. Volume/π?`,
        (4 * n ** 3) / 3,
        [2 * n * n, 4 * n ** 3, n ** 3 / 3],
        "Use a área do disco, não seu raio.",
      ],
      (n) => [
        `Arruela: raio externo 3, interno 1, comprimento ${n}. Volume/π?`,
        8 * n,
        [4 * n, 2 * n, 9 * n],
        "Subtraia os quadrados dos raios, não eleve a diferença ao quadrado.",
      ],
      (n) => [
        `Cone: raio ${n}, altura 6. Volume dividido por π?`,
        2 * n * n,
        [6 * n * n, 2 * n, 12 * n * n],
        "O cone tem um terço do volume do cilindro de mesma base e altura.",
      ],
    ],
    [
      (n) => [
        `∫_${n}^${n + 2} x dx`,
        2 * n + 2,
        [2, n + 2, 2 * n],
        "Avalie x²/2 nos dois limites.",
      ],
      (n) => [
        `∫₀^${n} (x+${n}) dx`,
        1.5 * n * n,
        [n * n, 2 * n * n, (n * n) / 2],
        "A área combina um triângulo e um retângulo.",
      ],
      (n) => [
        `∫₀^2 (−${n}x) dx`,
        -2 * n,
        [2 * n, -4 * n, -n],
        "A integral é assinada, não uma área geométrica positiva.",
      ],
      (n) => [
        `∫₁^3 ${n} dx`,
        2 * n,
        [3 * n, 4 * n, n],
        "Constante vezes comprimento do intervalo.",
      ],
    ],
  ],
  calculus3: [
    [
      (n) => [
        `f(x,y)=x²+y². f(−${n},${n}) = ?`,
        2 * n * n,
        [0, 2 * n, n * n],
        "Os quadrados eliminam os sinais e depois somam.",
      ],
      (n) => [
        `f(x,y)=x/y. Qual y não pode ser usado, mesmo com x=${n}?`,
        0,
        [n, 1, -n],
        "O domínio exclui denominador zero.",
      ],
      (n) => [
        `f(x,y)=xy. f(${n}+1,2)−f(${n},2) = ?`,
        2,
        [1, n, 2 * n],
        "A segunda coordenada permanece fixa na variação.",
      ],
      (n) => [
        `f(x,y,z)=x+y−z. f(${n},3,${n + 1}) = ?`,
        2,
        [4, 2 * n + 4, -2],
        "Substitua as três coordenadas e preserve a subtração.",
      ],
    ],
    [
      (n) => [
        `f(x,y)=${n}xy. ∂f/∂x em (2,3)?`,
        3 * n,
        [2 * n, 6 * n, n],
        "Na parcial em x, y é constante.",
      ],
      (n) => [
        `f(x,y)=x²+${n}y³. ∂f/∂x em (2,1)?`,
        4,
        [4 + 3 * n, 2, 3 * n],
        "Termos sem x têm parcial em x igual a zero.",
      ],
      (n) => [
        `f(x,y)=x²y. ∂f/∂y em (${n},2)?`,
        n * n,
        [2 * n, 2 * n * n, 4 * n],
        "Na parcial em y, x² fica como coeficiente.",
      ],
      (n) => [
        `f(x,y)=x³y². ∂²f/∂y∂x em (1,${n})?`,
        6 * n,
        [3 * n * n, 2 * n, 6 * n * n],
        "Derive primeiro em x, depois em y.",
      ],
    ],
    [
      (n) => [
        `f(x,y)=x²+y². |∇f(${n},0)| = ?`,
        2 * n,
        [n, 4 * n * n, 0],
        "Calcule o vetor gradiente e depois sua norma.",
      ],
      (n) => [
        `f(x,y)=${n}x+3y. Derivada direcional em u=(0,1)?`,
        3,
        [n, n + 3, 0],
        "Produto do gradiente pelo vetor unitário indicado.",
      ],
      (n) => [
        `f(x,y)=x²+y². Derivada direcional em (${n},0), u=(−1,0)?`,
        -2 * n,
        [2 * n, 0, 4 * n * n],
        "A direção oposta ao gradiente troca o sinal.",
      ],
      (n) => [
        `f(x,y)=${n}x+${n}y. Componente x do gradiente?`,
        n,
        [2 * n, n * n, 0],
        "O gradiente reúne as derivadas parciais, não a soma delas.",
      ],
    ],
    [
      (n) => [
        `u=(${n},2,0), v=(2,−${n},1). u·v = ?`,
        0,
        [4 * n, 2 * n, n * n + 4],
        "Multiplique componentes correspondentes e some com seus sinais.",
      ],
      (n) => [
        `u=(${n},0,0). u·u = ?`,
        n * n,
        [n, 2 * n, 0],
        "Produto consigo mesmo é o quadrado da norma.",
      ],
      (n) => [
        `u=(1,2,3). (u·(${n},0,0))/${n} = ?`,
        1,
        [n, 6, 0],
        "Só a primeira componente contribui para esse produto.",
      ],
      (n) => [
        `u=(${n},2,1). u·(0,0,1) = ?`,
        1,
        [n, 2, n + 3],
        "O vetor unitário seleciona a terceira componente.",
      ],
    ],
    [
      (n) => [
        `F=(x²,${n}y,z). div F em (2,1,1)?`,
        n + 5,
        [n + 3, n + 4, 4 * n],
        "Some as derivadas de cada componente em sua variável.",
      ],
      (n) => [
        `F=(${n}y,${n}z,${n}x). div F?`,
        0,
        [3 * n, n, 1],
        "Cada componente não depende de sua própria variável.",
      ],
      (n) => [
        `F=(${n}x,${n}y,−${2 * n}z). div F?`,
        0,
        [4 * n, 2 * n, -2 * n],
        "O sinal negativo da terceira componente cancela as duas primeiras.",
      ],
      (n) => [
        `F=(x,y,z). div F em (${n},${n},${n})?`,
        3,
        [3 * n, n, 0],
        "A divergência é constante e não depende do ponto.",
      ],
    ],
    [
      (n) => [
        `∫₀^2 ∫₀^${n} y dy dx`,
        n * n,
        [2 * n * n, (n * n) / 2, 2 * n],
        "Integre primeiro em y, depois multiplique pelo intervalo de x.",
      ],
      (n) => [
        `∫₀^${n} ∫₀^1 (x+1) dy dx`,
        (n * n) / 2 + n,
        [n * n + n, (n * n) / 2, 2 * n],
        "O intervalo interno tem comprimento um.",
      ],
      (n) => [
        `Retângulo 0≤x≤2, 0≤y≤${n}. Integral dupla de −3?`,
        -6 * n,
        [6 * n, -3 * n, -3],
        "Constante negativa vezes a área do domínio.",
      ],
      (n) => [
        `∫₀^1 ∫₀^${n} (x+2y) dy dx`,
        n * n + n / 2,
        [n * n, 2 * n * n + n, (n * n) / 2 + n],
        "Integre em y mantendo x constante, depois integre em x.",
      ],
    ],
  ],
};

export function challengeQuestion(
  course: MathCourseId,
  level: number,
  index: number,
  shuffle = 1,
): QualityQuestion {
  const final = index >= 48;
  const old = index < 24 ? bankQuestion(course, level, index) : null;
  const extra = index - (final ? 48 : 24);
  const variant = (old ? index : extra) % 6;
  const format = old ? old.format : 4 + Math.floor(extra / 6);
  const n = variant + (final ? 8 : 2);
  const entry = old ? null : EXTRA[course][level]![format - 4]!(n);
  let expression = old?.expression ?? entry![0];
  const answer = old?.answer ?? entry![1];
  const candidates = old ? originalChoiceErrors(course, level, index, answer) : entry![2];
  const round = (value: number) => Number(value.toFixed(2));
  if (round(answer) !== answer) expression += " Arredonde a 2 casas decimais.";
  const [min, max] = choiceBounds(course, level, format);
  // Em colisões editoriais, deslizes de uma/duas unidades completam a lista.
  // Nunca inserir negativos, probabilidades impossíveis ou um resto >= divisor.
  const wrong = [
    ...new Set([...candidates, answer - 1, answer + 1, answer - 2, answer + 2].map(round)),
  ].filter(
    (value) =>
      value !== round(answer) &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max &&
      !(course === "foundations" && level < 4 && !Number.isInteger(value)),
  );
  const choices = [round(answer), ...wrong.slice(0, 3)];
  let state = ((shuffle + index * 97 + level * 389) % 2147483646) + 1;
  for (let i = 3; i > 0; i--) {
    state = (state * 16807) % 2147483647;
    const j = state % (i + 1);
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }
  const difficulty = final ? 3 : variant < 2 ? 1 : variant < 4 ? 2 : 3;
  const reading = Math.ceil(expression.length / 12);
  return {
    id: old?.id ?? `${course}:${level}:${final ? "final" : "extra"}:${extra}`,
    revision: 3,
    format,
    expression,
    answer: round(answer),
    choices,
    seed: final ? 289 + level * 24 + extra : level * 48 + index + 1,
    topic: MATH_COURSES.find((item) => item.id === course)!.topics[level]!,
    budget: 28 + reading + (course.startsWith("calculus") ? 10 : 0) + (difficulty - 1) * 4,
    drain: 1,
    source:
      old?.source ??
      (final
        ? "Autoral OlenaStudy, banco reservado do desafio final."
        : "Autoral OlenaStudy, expansão editorial v4."),
    difficulty,
    review:
      entry?.[3] ?? "Resolva a operação indicada e confira sinais, unidades e ordem das operações.",
  };
}
