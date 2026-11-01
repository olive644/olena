import type { MathCourseId } from "../data/math-courses";
import type { MasteryQuestion } from "./math-mastery-engine";

type Solution = { value: number; steps: string[] };
type Format = (n: number) => Solution;
const s = (value: number, ...steps: string[]): Solution => ({ value, steps });
const f = (n: number) => String(Number(n.toFixed(2))).replace(".", ",");
const relation = (n: number) => (Math.abs(n - Number(n.toFixed(2))) > 1e-9 ? "≈" : "=");

// Mesma ordem editorial do banco: seis etapas, oito formatos por etapa.
// As contas abaixo são independentes do gabarito e não regeneram alternativas.
const SOLUTIONS: Record<MathCourseId, readonly (readonly Format[])[]> = {
  foundations: [
    [
      (n) => s(n + 8 + (n + 3), `Some as duas parcelas: ${n + 8} + ${n + 3} = ${2 * n + 11}.`),
      (n) =>
        s(
          3 * n + 9 - (n + 4),
          `Retire a parcela conhecida do total: ${3 * n + 9} − ${n + 4} = ${2 * n + 5}.`,
        ),
      (n) => s(n + (n + 7), `Junte as moedas: ${n} + ${n + 7} = ${2 * n + 7}.`),
      (n) =>
        s(
          n + 6 + (n + 2) + n,
          `Some primeiro ${n + 6} + ${n + 2} = ${2 * n + 8}.`,
          `Acrescente ${n}: ${2 * n + 8} + ${n} = ${3 * n + 8}.`,
        ),
      (n) =>
        s(
          n + 10 + (n + 9) - (2 * n + 18),
          `A soma correta é ${n + 10} + ${n + 9} = ${2 * n + 19}.`,
          `Falta ${2 * n + 19} − ${2 * n + 18} = 1.`,
        ),
      (n) =>
        s(
          n + 8 + (n + 12) - 20,
          `Total: ${n + 8} + ${n + 12} = ${2 * n + 20}.`,
          `Acima de 20: ${2 * n + 20} − 20 = ${2 * n}.`,
        ),
      (n) =>
        s(
          n + 6 + (n + 4) - (n + 2),
          `O lado esquerdo vale ${n + 6} + ${n + 4} = ${2 * n + 10}.`,
          `Logo ? = ${2 * n + 10} − ${n + 2} = ${n + 8}.`,
        ),
      (n) =>
        s(
          n + 5 + (n + 7 + (n + 3)),
          `Parênteses: ${n + 7} + ${n + 3} = ${2 * n + 10}.`,
          `Depois: ${n + 5} + ${2 * n + 10} = ${3 * n + 15}.`,
        ),
    ],
    [
      (n) => s(4 * n + 9 - (n + 3), `Subtraia: ${4 * n + 9} − ${n + 3} = ${3 * n + 6}.`),
      (n) =>
        s(
          3 * n + 8 - (n + 2),
          `A parte retirada é o total menos o restante: ${3 * n + 8} − ${n + 2} = ${2 * n + 6}.`,
        ),
      (n) => s(5 * n - 2 * n, `Retire as fichas que saíram: ${5 * n} − ${2 * n} = ${3 * n}.`),
      (n) =>
        s(
          3 * n + 10 - (n + 7),
          `Compare destino e início: ${3 * n + 10} − ${n + 7} = ${2 * n + 3}.`,
        ),
      (n) =>
        s(
          10 * n - 2 * n + n,
          `Após perder: ${10 * n} − ${2 * n} = ${8 * n}.`,
          `Após recuperar: ${8 * n} + ${n} = ${9 * n}.`,
        ),
      (n) =>
        s(2 * n + 5 + (n + 7), `Desfaça a subtração: ? = ${2 * n + 5} + ${n + 7} = ${3 * n + 12}.`),
      (n) =>
        s(
          10 * n + 2 - (n + 5),
          `Decomponha ${n + 5} em ${n} + 5.`,
          `${10 * n + 2} − ${n} = ${9 * n + 2}; depois ${9 * n + 2} − 5 = ${9 * n - 3}.`,
        ),
      (n) =>
        s(
          5 * n - (n + 3) - n,
          `Já obteve ${n + 3} + ${n} = ${2 * n + 3}.`,
          `Falta ${5 * n} − ${2 * n + 3} = ${3 * n - 3}.`,
        ),
    ],
    [
      (n) => s((n + 2) * (n + 3), `Multiplique: ${n + 2} × ${n + 3} = ${(n + 2) * (n + 3)}.`),
      (n) => s(n * (n + 5), `Caixas × peças por caixa: ${n} × ${n + 5} = ${n * (n + 5)}.`),
      (n) =>
        s(
          ((n + 2) * (n + 4)) / (n + 2),
          `Divida o produto pelo fator conhecido: ${(n + 2) * (n + 4)} ÷ ${n + 2} = ${n + 4}.`,
        ),
      (n) =>
        s(
          3 * (2 * (n + 3)),
          `Dobro: 2 × ${n + 3} = ${2 * n + 6}.`,
          `Triplo desse resultado: 3 × ${2 * n + 6} = ${6 * n + 18}.`,
        ),
      (n) =>
        s(
          n * (n + 4) - n * n,
          `Distribua: ${n} × (${n} + 4) = ${n * n} + ${4 * n}.`,
          `A parcela que falta é ${4 * n}.`,
        ),
      (n) =>
        s(
          (n + 3 - 1) * (n + 2),
          `Restam ${n + 3} − 1 = ${n + 2} fileiras.`,
          `Lugares livres: ${n + 2} × ${n + 2} = ${(n + 2) ** 2}.`,
        ),
      (n) =>
        s(
          n * (n + 2) * 3,
          `Uma caixa: ${n + 2} × 3 = ${3 * (n + 2)} peças.`,
          `${n} caixas: ${n} × ${3 * (n + 2)} = ${3 * n * (n + 2)}.`,
        ),
      (n) =>
        s(
          n * (n + 4 + 2 - (n + 4)),
          `O segundo fator cresce 2.`,
          `O produto cresce ${n} × 2 = ${2 * n}.`,
        ),
    ],
    [
      (n) => s((n * (n + 3)) / n, `Divida: ${n * (n + 3)} ÷ ${n} = ${n + 3}.`),
      (n) => s((n * (n + 5)) / (n + 5), `Fichas por grupo: ${n * (n + 5)} ÷ ${n + 5} = ${n}.`),
      (n) =>
        s(
          ((n + 2) * (n + 4)) / (n + 4),
          `O divisor é o dividendo dividido pelo quociente: ${(n + 2) * (n + 4)} ÷ ${n + 4} = ${n + 2}.`,
        ),
      (n) =>
        s(
          Math.floor((4 * n + 2) / 4),
          `${4 * n + 2} = 4 × ${n} + 2.`,
          `São ${n} caixas completas e 2 peças restantes.`,
        ),
      (n) => s((5 * n + 2) % 5, `${5 * n + 2} = 5 × ${n} + 2.`, `O resto é 2 peças, menor que 5.`),
      (n) =>
        s(
          Math.ceil((4 * n + 1) / 4),
          `${4 * n + 1} = 4 × ${n} + 1.`,
          `${n} carros não bastam; a pessoa restante exige mais um: ${n + 1}.`,
        ),
      (n) =>
        s(
          (n * (n + 3) + 2 - 2) / (n + 3),
          `Retire o resto: ${n * (n + 3) + 2} − 2 = ${n * (n + 3)}.`,
          `Quociente: ${n * (n + 3)} ÷ ${n + 3} = ${n}.`,
        ),
      (n) =>
        s(
          (12 * n) / 3 / 4,
          `Cada grupo recebe ${12 * n} ÷ 3 = ${4 * n}.`,
          `Cada pessoa recebe ${4 * n} ÷ 4 = ${n}.`,
        ),
    ],
    [
      (n) => s((12 * n) / 4, `Um quarto: ${12 * n} ÷ 4 = ${3 * n}.`),
      (n) =>
        s(
          ((8 * n) / 4) * 3,
          `Um quarto: ${8 * n} ÷ 4 = ${2 * n}.`,
          `Três quartos: ${2 * n} × 3 = ${6 * n}.`,
        ),
      (n) =>
        s(
          (6 * n) / 2 + (6 * n) / 3,
          `Metade: ${6 * n} ÷ 2 = ${3 * n}; um terço: ${6 * n} ÷ 3 = ${2 * n}.`,
          `Some: ${3 * n} + ${2 * n} = ${5 * n}.`,
        ),
      (n) =>
        s(
          8 * n - ((8 * n) / 8) * 3,
          `Usadas: ${8 * n} ÷ 8 × 3 = ${3 * n}.`,
          `Sobraram: ${8 * n} − ${3 * n} = ${5 * n}.`,
        ),
      (n) =>
        s(
          (n / (4 * n)) * 100,
          `Parte / total = ${n}/${4 * n} = 1/4.`,
          `Porcentagem: 100 ÷ 4 = 25%.`,
        ),
      (n) =>
        s(
          (8 * n) / 2 / 2,
          `Primeira metade: ${8 * n} ÷ 2 = ${4 * n}.`,
          `Segunda metade: ${4 * n} ÷ 2 = ${2 * n}.`,
        ),
      (n) => s(2 * n * 3, `O inteiro tem três terços: ${2 * n} × 3 = ${6 * n}.`),
      (n) =>
        s(
          (8 * n * 3) / 4 / 2,
          `Receita inteira: ${8 * n} ÷ 4 × 3 = ${6 * n} mL.`,
          `Metade: ${6 * n} ÷ 2 = ${3 * n} mL.`,
        ),
    ],
    [
      (n) => s((20 * n * 25) / 100, `25% = 1/4; ${20 * n} ÷ 4 = ${5 * n}.`),
      (n) =>
        s(
          20 * n * (1 - 20 / 100),
          `Desconto: ${20 * n} × 20/100 = ${4 * n}.`,
          `Pague: ${20 * n} − ${4 * n} = ${16 * n}.`,
        ),
      (n) =>
        s(
          ((3 * n) / (12 * n)) * 100,
          `Azuis / total = ${3 * n}/${12 * n} = 1/4.`,
          `1/4 × 100 = 25%.`,
        ),
      (n) =>
        s(
          10 * n * (1 + 30 / 100),
          `Aumento: ${10 * n} × 30/100 = ${3 * n}.`,
          `Novo preço: ${10 * n} + ${3 * n} = ${13 * n}.`,
        ),
      (n) =>
        s(
          100 * n * 0.9 * 0.8,
          `Primeiro desconto: ${100 * n} × 0,9 = ${90 * n}.`,
          `Segundo desconto: ${90 * n} × 0,8 = ${72 * n}.`,
        ),
      (n) =>
        s(
          (25 * n) / 1.25,
          `Preço novo = preço antigo × 1,25.`,
          `Preço antigo: ${25 * n} ÷ 1,25 = ${20 * n}.`,
        ),
      (n) =>
        s(
          ((12 * n - 10 * n) / (10 * n)) * 100,
          `Aumento: ${12 * n} − ${10 * n} = ${2 * n}.`,
          `Percentual: ${2 * n}/${10 * n} × 100 = 20%.`,
        ),
      (n) =>
        s(
          Math.max(20 * n * 0.25, 4 * n),
          `25% de ${20 * n} = ${5 * n} reais.`,
          `Compare ${5 * n} com ${4 * n}; a maior economia é ${5 * n} reais.`,
        ),
    ],
  ],
  school: [
    [
      (n) =>
        s(
          (n * 4 + n + 2 - (n + 2)) / n,
          `Retire ${n + 2} dos dois lados: ${n}x = ${4 * n}.`,
          `Divida por ${n}: x = 4.`,
        ),
      (n) =>
        s((6 * n) / 2 - n, `Divida por 2: x + ${n} = ${3 * n}.`, `x = ${3 * n} − ${n} = ${2 * n}.`),
      (n) => s((5 * n + n) / 3, `Some ${n}: 3x = ${6 * n}.`, `Divida por 3: x = ${2 * n}.`),
      (n) =>
        s(
          ((n + 2) * (n + 3)) / (n + 2),
          `Peso por caixa = ${(n + 2) * (n + 3)} ÷ ${n + 2} = ${n + 3} kg.`,
        ),
      (n) => s((3 * n) / n + 2, `Divida por ${n}: x − 2 = 3.`, `Some 2: x = 5.`),
      (n) =>
        s(
          (n + 7 - 4) / (n - (n - 1)),
          `Subtraia ${n - 1}x dos dois lados: x + 4 = ${n + 7}.`,
          `x = ${n + 7} − 4 = ${n + 3}.`,
        ),
      (n) => s((3 + 2) * n, `Some 2: x/${n} = 5.`, `Multiplique por ${n}: x = ${5 * n}.`),
      (n) => s((n - (n + 8)) / -2, `Subtraia ${n + 8}: −2x = −8.`, `Divida por −2: x = 4.`),
    ],
    [
      (n) => s(n * n * n, `Cubo: ${n} × ${n} = ${n * n}; ${n * n} × ${n} = ${n ** 3}.`),
      (n) =>
        s(
          2 ** n * 2 ** 2,
          `Mesma base: some os expoentes, ${n} + 2 = ${n + 2}.`,
          `2^${n + 2} = ${2 ** (n + 2)}.`,
        ),
      (n) => s((n ** 2) ** 2, `Potência de potência: 2 × 2 = 4.`, `${n}^4 = ${n ** 4}.`),
      (n) => s(n ** 3 / n ** 2, `Mesma base: subtraia expoentes, 3 − 2 = 1.`, `${n}^1 = ${n}.`),
      (n) =>
        s(
          (n + 1) ** 2 - n * n,
          `Expanda (${n}+1)² = ${n * n} + ${2 * n} + 1.`,
          `Retire ${n * n}: ${2 * n} + 1 = ${2 * n + 1}.`,
        ),
      (n) => s((-n) ** 2 - n * n, `O quadrado de −${n} é ${n * n}.`, `${n * n} − ${n * n} = 0.`),
      (n) => s(2 ** (n + 2) / 2 ** n, `Subtraia os expoentes: ${n + 2} − ${n} = 2.`, `2² = 4.`),
      (n) =>
        s(
          n ** 0 + n,
          `${n} não é zero, portanto ${n}^0 = 1.`,
          `${n}^1 = ${n}; 1 + ${n} = ${n + 1}.`,
        ),
    ],
    [
      (n) =>
        s(
          2 * (n + 1) + n,
          `Substitua x por ${n + 1}: 2 × ${n + 1} + ${n}.`,
          `${2 * n + 2} + ${n} = ${3 * n + 2}.`,
        ),
      (n) => s((3 * n - 1 + 1) / n, `Some 1: ${n}x = ${3 * n}.`, `Divida por ${n}: x = 3.`),
      (n) =>
        s(
          n + 4 * (n + 2),
          `Quatro quilômetros: 4 × ${n + 2} = ${4 * n + 8}.`,
          `Some a taxa fixa: ${n} + ${4 * n + 8} = ${5 * n + 8}.`,
        ),
      (n) => s((-n) ** 2 - n, `Substitua: (−${n})² − ${n}.`, `${n * n} − ${n} = ${n * n - n}.`),
      (n) => s((n + 12 - n) / 3, `Iguale: 3x + ${n} = ${n + 12}.`, `3x = 12; x = 4.`),
      (n) =>
        s(
          -n * 2,
          `A variação de uma função afim é coeficiente × variação de x.`,
          `Δf = −${n} × 2 = ${-2 * n}.`,
        ),
      (n) =>
        s(
          -3 / n,
          `Na raiz, f(x) = 0: ${n}x + 3 = 0.`,
          `${n}x = −3; x = −3/${n} ${relation(-3 / n)} ${f(-3 / n)}.`,
        ),
      (n) =>
        s(
          (2 * n) / (3 - 2),
          `Iguale as tarifas: ${2 * n} + 2d = 3d.`,
          `Subtraia 2d: d = ${2 * n} km.`,
        ),
    ],
    [
      (n) =>
        s(
          2 * (n + (n + 3)),
          `Perímetro soma os quatro lados: 2 × (${n} + ${n + 3}).`,
          `2 × ${2 * n + 3} = ${4 * n + 6}.`,
        ),
      (n) =>
        s(
          (2 * n * (n + 2)) / 2,
          `Área do triângulo = base × altura ÷ 2.`,
          `${2 * n} × ${n + 2} ÷ 2 = ${n * (n + 2)}.`,
        ),
      (n) => s(Math.sqrt(n * n), `Lado² = área = ${n * n}.`, `O lado positivo é √${n * n} = ${n}.`),
      (n) =>
        s(
          2 * (n + (n + 2)) - 1,
          `Perímetro completo: 2 × (${n} + ${n + 2}) = ${4 * n + 4}.`,
          `Retire o portão de 1 metro: ${4 * n + 4} − 1 = ${4 * n + 3} metros de cerca.`,
        ),
      (n) =>
        s((2 * n) ** 2, `Novo lado: 2 × ${n} = ${2 * n}.`, `Nova área: ${2 * n}² = ${4 * n * n}.`),
      (n) =>
        s(
          (2 * (3 * n)) / (2 * n),
          `A = base × altura/2, então altura = 2A/base.`,
          `2 × ${3 * n} ÷ ${2 * n} = 3.`,
        ),
      (n) => s(n * 3 * 4, `Volume = ${n} × 3 × 4 = ${12 * n}.`),
      (n) =>
        s(
          n * (n + 4 + 2 - (n + 4)),
          `A faixa acrescentada tem altura ${n} e largura 2.`,
          `Aumento da área: ${n} × 2 = ${2 * n}.`,
        ),
    ],
    [
      (n) =>
        s(
          n + 5 * 3,
          `A razão é ${n + 3} − ${n} = 3.`,
          `Sexto termo: ${n} + (6 − 1) × 3 = ${n + 15}.`,
        ),
      (n) => s(4 * n * 2, `Razão: ${2 * n} ÷ ${n} = 2.`, `Próximo termo: ${4 * n} × 2 = ${8 * n}.`),
      (n) =>
        s(
          2 + 4 * n,
          `Do primeiro ao quinto termo há quatro passos de ${n}.`,
          `2 + 4 × ${n} = ${2 + 4 * n}.`,
        ),
      (n) =>
        s(n + 12 + 8, `As diferenças são 2, 4 e 6; a próxima é 8.`, `${n + 12} + 8 = ${n + 20}.`),
      (n) => s(n + 4 - n, `Razão da PA: ${n + 4} − ${n} = 4.`, `Confira: ${n + 8} − ${n + 4} = 4.`),
      (n) =>
        s((3 * n) / n, `Razão da PG: ${3 * n} ÷ ${n} = 3.`, `Confira: ${9 * n} ÷ ${3 * n} = 3.`),
      (n) =>
        s(
          n + (n + 2) + (n + 4) + (n + 6),
          `Quatro termos: ${n}, ${n + 2}, ${n + 4}, ${n + 6}.`,
          `Soma = ${4 * n + 12}.`,
        ),
      (n) =>
        s(
          5 * n + 1 - (2 * n + 1),
          `a(5) = ${5 * n + 1}; a(2) = ${2 * n + 1}.`,
          `Diferença: ${5 * n + 1} − ${2 * n + 1} = ${3 * n}.`,
        ),
    ],
    [
      (n) =>
        s(
          (n / (n + 3 * n)) * 100,
          `Total: ${n} + ${3 * n} = ${4 * n}.`,
          `Chance: ${n}/${4 * n} × 100 = 25%.`,
        ),
      (n) =>
        s(
          (n / (n + n)) * 100,
          `Total: ${n} + ${n} = ${2 * n}.`,
          `Chance: ${n}/${2 * n} × 100 = 50%.`,
        ),
      (n) => s(((3 * n) / (5 * n)) * 100, `Percentual de acertos: ${3 * n}/${5 * n} × 100 = 60%.`),
      (n) =>
        s(
          ((4 * n) / (n + 4 * n)) * 100,
          `Não verde significa branca: ${4 * n} de ${5 * n}.`,
          `${4 * n}/${5 * n} × 100 = 80%.`,
        ),
      (n) =>
        s(
          (n / (2 * n)) ** 2 * 100,
          `Em cada retirada com reposição: ${n}/${2 * n} = 1/2.`,
          `Duas azuis: 1/2 × 1/2 = 1/4 = 25%.`,
        ),
      (n) =>
        s(
          (1 - n / (4 * n)) * 100,
          `Azul: ${n}/${4 * n} × 100 = 25%.`,
          `Não azul: 100% − 25% = 75%.`,
        ),
      () =>
        s(
          (1 / 2) * 100,
          `A primeira moeda é justa: uma face cara entre duas faces.`,
          `1/2 × 100 = 50%, independentemente das outras moedas.`,
        ),
      (n) =>
        s(
          ((2 * n) / (10 * n)) * 100,
          `Bilhetes favoráveis / total: ${2 * n}/${10 * n} = 1/5.`,
          `1/5 × 100 = 20%.`,
        ),
    ],
  ],
  advanced: [
    [
      (n) =>
        s(
          Math.abs(n - 3 - n),
          `Substitua: |${n - 3} − ${n}| = |−3|.`,
          `Módulo é distância até zero: |−3| = 3.`,
        ),
      (n) =>
        s(n * n - 2 * n, `Substitua: ${n}² − 2 × ${n}.`, `${n * n} − ${2 * n} = ${n * n - 2 * n}.`),
      (n) =>
        s(n / 0.5, `Dividir por 1/2 equivale a multiplicar por 2.`, `${n} ÷ (1/2) = ${2 * n}.`),
      (n) => s((n + 6 - n) / 2, `Para inverter, resolva 2x + ${n} = ${n + 6}.`, `2x = 6; x = 3.`),
      (n) =>
        s(
          (-n) ** 2 - n * n,
          `f(−${n}) = ${n * n}; f(${n}) = ${n * n}.`,
          `Diferença: ${n * n} − ${n * n} = 0.`,
        ),
      (n) =>
        s(
          Math.abs(n - n),
          `O módulo nunca é negativo.`,
          `Em x = ${n}, |${n} − ${n}| = 0; este é o mínimo.`,
        ),
      (n) =>
        s(
          n,
          `O denominador não pode ser zero: x − ${n} ≠ 0.`,
          `Portanto x = ${n} fica fora do domínio.`,
        ),
      (n) =>
        s(
          (n + 6 + n) / 3,
          `Resolva 3x − ${n} = ${n + 6}.`,
          `3x = ${2 * n + 6}; x = ${2 * n + 6}/3 ${relation((2 * n + 6) / 3)} ${f((2 * n + 6) / 3)}.`,
        ),
    ],
    [
      (n) => s(n, `Logaritmo é o expoente: 2^${n} = ${2 ** n}.`, `Logo log₂(${2 ** n}) = ${n}.`),
      (n) => s(n, `10^${n} = ${10 ** n}.`, `Logo log₁₀(${10 ** n}) = ${n}.`),
      (n) => s(n + 2, `2^${n} = ${2 ** n} e 2² = 4.`, `Some os logaritmos: ${n} + 2 = ${n + 2}.`),
      (n) => s(n, `3^${n} = ${3 ** n}.`, `Logo log₃(${3 ** n}) = ${n}.`),
      (n) =>
        s(
          n + 3,
          `8 = 2³; ${2 ** n} × 8 = 2^(${n}+3).`,
          `Logaritmo na base 2: ${n} + 3 = ${n + 3}.`,
        ),
      (n) =>
        s(
          n + 2 - 2,
          `4 = 2²; ${2 ** (n + 2)} ÷ 4 = 2^(${n + 2}−2) = 2^${n}.`,
          `O logaritmo vale ${n}.`,
        ),
      (n) =>
        s(3 ** n, `Pela definição, log₃(x) = ${n} equivale a x = 3^${n}.`, `3^${n} = ${3 ** n}.`),
      (n) => s(-n, `1/${2 ** n} = 2^(−${n}).`, `Logo log₂(1/${2 ** n}) = ${-n}.`),
    ],
    [
      (n) => s(2 * n * 0.5, `sen(30°) = 1/2.`, `${2 * n} × 1/2 = ${n}.`),
      (n) => s(n * -1, `cos(180°) = −1.`, `${n} × (−1) = ${-n}.`),
      (n) => s(n * 1 + 2, `tan(45°) = 1.`, `${n} × 1 + 2 = ${n + 2}.`),
      (n) =>
        s(n * 0 + (n + 3) * 1, `sen(0°) = 0 e cos(0°) = 1.`, `${n} × 0 + ${n + 3} × 1 = ${n + 3}.`),
      (n) => s(n * 1, `A identidade sen²(θ) + cos²(θ) = 1 vale também em 20°.`, `${n} × 1 = ${n}.`),
      (n) =>
        s(
          2 * n * 0.5 - n * 1,
          `cos(60°) = 1/2; sen(90°) = 1.`,
          `${2 * n} × 1/2 − ${n} × 1 = ${n} − ${n} = 0.`,
        ),
      (n) => s(n * 1 + n * -1, `cos(360°) = 1; cos(180°) = −1.`, `${n} × 1 + ${n} × (−1) = 0.`),
      (n) =>
        s(n * 0 + 2 * n * 0.5, `tan(0°) = 0; sen(30°) = 1/2.`, `${n} × 0 + ${2 * n} × 1/2 = ${n}.`),
    ],
    [
      (n) =>
        s(
          n * 3 + 2 * (n + 1),
          `Produto escalar: ${n} × 3 + 2 × ${n + 1}.`,
          `${3 * n} + ${2 * n + 2} = ${5 * n + 2}.`,
        ),
      (n) =>
        s(
          n + 3,
          `Some coordenadas correspondentes: (${n}+3, 2+4) = (${n + 3}, 6).`,
          `A primeira coordenada é ${n + 3}.`,
        ),
      (n) =>
        s(
          Math.sqrt((3 * n) ** 2 + (4 * n) ** 2),
          `Norma² = ${3 * n}² + ${4 * n}² = ${25 * n * n}.`,
          `Norma = √${25 * n * n} = ${5 * n}.`,
        ),
      (n) =>
        s(n * 2 + 2 * -n, `Produto escalar: ${n} × 2 + 2 × (−${n}).`, `${2 * n} − ${2 * n} = 0.`),
      (n) =>
        s(
          n * 2 + 2 * -n,
          `Multiplique componentes: ${n} × 2 = ${2 * n}; 2 × (−${n}) = ${-2 * n}.`,
          `Some: ${2 * n} + (${-2 * n}) = 0.`,
        ),
      (n) =>
        s(
          n * n + (-n) ** 2,
          `Comprimento² = ${n}² + (−${n})².`,
          `${n * n} + ${n * n} = ${2 * n * n}.`,
        ),
      (n) =>
        s(2 * 3, `Multiplique cada componente por 2: 2u = (${2 * n}, 6).`, `A componente y é 6.`),
      (n) =>
        s(
          Math.abs(n + 5 - n),
          `Diferença vertical: 2 − 2 = 0.`,
          `Distância horizontal: |${n + 5} − ${n}| = 5.`,
        ),
    ],
    [
      (n) =>
        s(
          2 * (3 + n),
          `Primeiro f(3) = 3 + ${n} = ${n + 3}.`,
          `Depois g(${n + 3}) = 2 × ${n + 3} = ${2 * n + 6}.`,
        ),
      (n) =>
        s(
          (n + 1) ** 2,
          `Primeiro g(${n}) = ${n} + 1 = ${n + 1}.`,
          `Depois f(${n + 1}) = ${n + 1}² = ${(n + 1) ** 2}.`,
        ),
      (n) =>
        s(
          3 * (n + 2 - n),
          `Primeiro g(${n + 2}) = ${n + 2} − ${n} = 2.`,
          `Depois f(2) = 3 × 2 = 6.`,
        ),
      (n) =>
        s(
          (1 + n) ** 2,
          `Primeiro f(1) = 1 + ${n} = ${n + 1}.`,
          `Depois g(${n + 1}) = ${n + 1}² = ${(n + 1) ** 2}.`,
        ),
      (n) => s(2 ** 2 + n, `Primeiro f(2) = 2² = 4.`, `Depois g(4) = 4 + ${n} = ${n + 4}.`),
      (n) =>
        s(
          2 * (1 + n) - (2 + n),
          `f(g(1)) = 2 × (1 + ${n}) = ${2 * n + 2}.`,
          `g(f(1)) = 2 + ${n} = ${n + 2}; diferença = ${n}.`,
        ),
      (n) => s(n + 3 - n + n, `g(${n + 3}) = ${n + 3} − ${n} = 3.`, `f(3) = 3 + ${n} = ${n + 3}.`),
      (n) => s(n * 2 ** 2, `Primeiro g(2) = 2² = 4.`, `Depois f(4) = ${n} × 4 = ${4 * n}.`),
    ],
    [
      (n) =>
        s(
          ((n + 2) ** 2 - n * n) / 2,
          `Variação de f: ${n + 2}² − ${n}² = ${4 * n + 4}.`,
          `Divida pelo intervalo ${n + 2} − ${n} = 2: taxa = ${2 * n + 2}.`,
        ),
      (n) =>
        s(
          (9 * n - 3 * n) / 3,
          `Variação da distância: ${9 * n} − ${3 * n} = ${6 * n}.`,
          `Taxa: ${6 * n} ÷ 3 = ${2 * n} por segundo.`,
        ),
      (n) =>
        s(
          (4 * n + 2 - (n + 2)) / 3,
          `f(4) = ${4 * n + 2}; f(1) = ${n + 2}.`,
          `Taxa: (${4 * n + 2} − ${n + 2})/(4 − 1) = ${3 * n}/3 = ${n}.`,
        ),
      (n) =>
        s(
          (-5 * n - -2 * n) / 3,
          `f(5) = ${-5 * n}; f(2) = ${-2 * n}.`,
          `Taxa: (${-5 * n} − (${-2 * n}))/(5 − 2) = ${-n}.`,
        ),
      (n) =>
        s(
          (n * n - (-n) ** 2) / (2 * n),
          `f(${n}) = f(−${n}) = ${n * n}.`,
          `Taxa: (${n * n} − ${n * n})/${2 * n} = 0.`,
        ),
      (n) =>
        s(
          (7 * n + 4 - (2 * n + 4)) / 5,
          `Variação da imagem: ${7 * n + 4} − ${2 * n + 4} = ${5 * n}.`,
          `Taxa: ${5 * n}/(7 − 2) = ${n}.`,
        ),
      (n) =>
        s(
          (-3 * n) / 3,
          `Queda de ${3 * n} graus significa variação ${-3 * n}.`,
          `Taxa: ${-3 * n} ÷ 3 = ${-n} graus por hora.`,
        ),
      (n) =>
        s(
          (9 * n - n) / 2,
          `s(3) = ${9 * n}; s(1) = ${n}.`,
          `Velocidade média: (${9 * n} − ${n})/(3 − 1) = ${4 * n}.`,
        ),
    ],
  ],
  calculus1: [
    [
      (n) =>
        s(
          n * n - 1,
          `Polinômios são contínuos; substitua x por ${n}.`,
          `${n}² − 1 = ${n * n - 1}.`,
        ),
      (n) =>
        s(
          n + n,
          `Fatore x² − ${n * n} = (x − ${n})(x + ${n}).`,
          `Para x ≠ ${n}, cancele x − ${n}; o limite é ${n} + ${n} = ${2 * n}.`,
        ),
      (n) =>
        s(
          n,
          `Em radianos, sen(u)/u tende a 1 quando u tende a zero.`,
          `sen(${n}x)/x = ${n} × sen(${n}x)/(${n}x); limite = ${n}.`,
        ),
      (n) =>
        s(
          n / 1,
          `Divida numerador e denominador por x: (${n} + 1/x)/(1 + 3/x).`,
          `Quando x cresce, 1/x e 3/x tendem a zero; limite = ${n}/1 = ${n}.`,
        ),
      (n) =>
        s(
          n + n,
          `x² − ${n * n} = (x − ${n})(x + ${n}).`,
          `Cancele para x ≠ ${n}; limite de x + ${n} = ${2 * n}.`,
        ),
      (n) =>
        s(
          0,
          `Use 1 − cos(u) = 2sen²(u/2).`,
          `(1 − cos(${n}x))/x = (${n}²x/2) × [sen(${n}x/2)/(${n}x/2)]².`,
          `Em radianos, o fator entre colchetes tende a 1 e x tende a 0; limite = 0.`,
        ),
      (n) =>
        s(
          n / 2,
          `Divida por x²: (${n} + 1/x²)/(2 + 3/x²).`,
          `Os termos com 1/x² tendem a zero: limite = ${n}/2 = ${f(n / 2)}.`,
        ),
      (n) =>
        s(
          (2 * n) / n,
          `Em radianos, escreva ${2 * n}/${n} × sen(${2 * n}x)/(${2 * n}x).`,
          `A razão seno/argumento tende a 1; limite = 2.`,
        ),
    ],
    [
      (n) => s(n, `A derivada de ax + b é a.`, `f′(x) = ${n}; em x = 2 continua ${n}.`),
      (n) =>
        s(
          2 * n * 1,
          `Pela regra da potência, f′(x) = ${2 * n}x.`,
          `Em x = 1: ${2 * n} × 1 = ${2 * n}.`,
        ),
      (n) => s(0, `f(x) = ${n} é constante.`, `Sua taxa de variação é zero: f′(3) = 0.`),
      (n) => s(3 * n * n, `A derivada de x³ é 3x².`, `f′(${n}) = 3 × ${n}² = ${3 * n * n}.`),
      (n) =>
        s(
          2 * n * 3,
          `Velocidade instantânea é s′(t) = ${2 * n}t.`,
          `Em t = 3: ${2 * n} × 3 = ${6 * n}.`,
        ),
      (n) => s(-n * 1 ** -2, `Escreva f(x) = ${n}x^(−1).`, `f′(x) = −${n}x^(−2); f′(1) = ${-n}.`),
      (n) =>
        s(
          1,
          `A derivada de sen(x) é cos(x); a constante ${n} tem derivada zero.`,
          `f′(0) = cos(0) = 1.`,
        ),
      (n) => s(1 + n, `f′(x) = e^x + ${n}.`, `e^0 = 1; f′(0) = 1 + ${n} = ${n + 1}.`),
    ],
    [
      (n) =>
        s(
          n * 1 ** (n - 1),
          `Regra da potência: d(x^${n})/dx = ${n}x^${n - 1}.`,
          `Em x = 1: ${n} × 1^${n - 1} = ${n}.`,
        ),
      (n) =>
        s(
          n * (-1) ** (n - 1),
          `Regra da potência: f′(x) = ${n}x^${n - 1}.`,
          `Em x = −1: ${n} × (−1)^${n - 1} = ${n * (-1) ** (n - 1)}.`,
        ),
      (n) => s(3 * n * 2 ** 2, `f′(x) = ${3 * n}x².`, `f′(2) = ${3 * n} × 4 = ${12 * n}.`),
      (n) =>
        s((n + 1) * 0 ** n, `f′(x) = ${n + 1}x^${n}.`, `Como ${n} > 0, f′(0) = ${n + 1} × 0 = 0.`),
      (n) =>
        s(
          (n + 2) * 2 ** (n + 1),
          `Regra da potência: f′(x) = ${n + 2}x^${n + 1}.`,
          `f′(2) = ${n + 2} × ${2 ** (n + 1)} = ${(n + 2) * 2 ** (n + 1)}.`,
        ),
      (n) =>
        s(
          -n * 1 ** (-n - 1),
          `Pela potência, f′(x) = −${n}x^(−${n + 1}).`,
          `Em x = 1: −${n} × 1 = ${-n}.`,
        ),
      (n) =>
        s(
          n * 0.5,
          `Escreva √x = x^(1/2).`,
          `f′(x) = (${n}/2)x^(−1/2); em x = 1: ${n}/2 = ${f(n / 2)}.`,
        ),
      (n) =>
        s(
          2 * (n * 0 + 1) * n,
          `Regra da cadeia: f′(x) = 2(${n}x + 1) × ${n}.`,
          `Em x = 0: 2 × 1 × ${n} = ${2 * n}.`,
        ),
    ],
    [
      (n) =>
        s(2 * 2 + n, `Derive as parcelas: f′(x) = 2x + ${n}.`, `Em x = 2: 4 + ${n} = ${n + 4}.`),
      (n) => s(3 * 1 ** 2 - n, `f′(x) = 3x² − ${n}.`, `Em x = 1: 3 − ${n} = ${3 - n}.`),
      (n) =>
        s(
          2 * n * 2,
          `f′(x) = ${2 * n}x; a constante ${n + 1} desaparece.`,
          `f′(2) = ${2 * n} × 2 = ${4 * n}.`,
        ),
      (n) =>
        s(6 * 1 ** 2 + 2 * n, `f′(x) = 6x² + ${2 * n}x.`, `f′(1) = 6 + ${2 * n} = ${6 + 2 * n}.`),
      (n) =>
        s(2 * 2 - n, `f′(x) = 2x − ${n}; 7 tem derivada zero.`, `f′(2) = 4 − ${n} = ${4 - n}.`),
      (n) => s(2 * n * 0 + 3, `f′(x) = ${2 * n}x + 3.`, `f′(0) = ${2 * n} × 0 + 3 = 3.`),
      (n) =>
        s(
          n + 3,
          `Derive as duas funções afins: ${n} + 3.`,
          `A derivada é constante, então f′(5) = ${n + 3}.`,
        ),
      (n) => s(3 - 2 * n, `f′(x) = 3x² − ${2 * n}x.`, `Em x = 1: 3 − ${2 * n} = ${3 - 2 * n}.`),
    ],
    [
      (n) => s(2 * n, `A inclinação da tangente é y′ = 2x.`, `Em x = ${n}: 2 × ${n} = ${2 * n}.`),
      (n) => s(3 * n * 1 ** 2, `y′ = ${3 * n}x².`, `Em x = 1, a inclinação é ${3 * n}.`),
      (n) =>
        s(
          n * n - 2 * n * n,
          `No ponto: y = ${n * n}; inclinação = ${2 * n}.`,
          `Tangente: y − ${n * n} = ${2 * n}(x − ${n}).`,
          `Em x = 0: y = ${n * n} − ${2 * n * n} = ${-n * n}.`,
        ),
      (n) =>
        s(n, `A derivada de ${n}x + 2 é ${n}.`, `A inclinação da reta é ${n} também em x = 3.`),
      (n) =>
        s(
          n * n - 2 * n * n,
          `f(${n}) = ${n * n}; f′(${n}) = ${2 * n}.`,
          `Tangente: y = ${n * n} + ${2 * n}(x − ${n}).`,
          `Em x = 0: y = ${-n * n}.`,
        ),
      (n) =>
        s(
          0,
          `A tangente é horizontal quando y′ = 0.`,
          `2 × ${n} × x = 0; como ${2 * n} ≠ 0, x = 0.`,
        ),
      (n) =>
        s(
          3 * n + 2,
          `Uma função afim coincide com sua tangente: y = ${n}x + 2.`,
          `Em x = 3: ${3 * n} + 2 = ${3 * n + 2}.`,
        ),
      (n) =>
        s(
          4 * 0.5,
          `Pela aproximação linear em ${n}, Δf ≈ f′(${n}) × Δx.`,
          `Δf ≈ 4 × 0,5 = 2; é uma estimativa pela tangente.`,
        ),
    ],
    [
      (n) =>
        s(
          n,
          `O quadrado (x − ${n})² é não negativo.`,
          `Seu mínimo ocorre em x − ${n} = 0, portanto x = ${n}.`,
        ),
      (n) =>
        s(
          4,
          `−(x − ${n})² ≤ 0.`,
          `Somando 4, f(x) ≤ 4, com igualdade em x = ${n}; o valor máximo é 4.`,
        ),
      (n) =>
        s(
          (2 * n) / 2,
          `Derive: f′(x) = 2x − ${2 * n}.`,
          `Ponto crítico: 2x − ${2 * n} = 0; x = ${n}.`,
        ),
      (n) => s(-n, `O quadrado mínimo é zero.`, `x + ${n} = 0; x = ${-n}.`),
      (n) =>
        s(
          n + 2,
          `O termo (x − ${n})² tem mínimo zero, em x = ${n}.`,
          `Valor mínimo: 0 + ${n + 2} = ${n + 2}.`,
        ),
      (n) =>
        s(
          (2 * n) / 2,
          `f′(x) = −2x + ${2 * n}; igualando a zero, x = ${n}.`,
          `f″(x) = −2 < 0, portanto esse ponto é máximo.`,
        ),
      (n) =>
        s(
          Math.max((-n) ** 2, (n + 1) ** 2),
          `O ponto crítico x = 0 dá valor 0.`,
          `Nos extremos: f(−${n}) = ${n * n}; f(${n + 1}) = ${(n + 1) ** 2}.`,
          `O maior valor é ${(n + 1) ** 2}.`,
        ),
      (n) =>
        s(
          -n,
          `O quadrado (x + ${n})² tem mínimo zero.`,
          `Anule x + ${n}: x = ${-n}; a constante 1 não muda esse x.`,
        ),
    ],
  ],
  calculus2: [
    [
      (n) =>
        s(
          n * 2 ** 2 + 3,
          `Integre: F(x) = ${n}x² + C.`,
          `F(0) = 3 dá C = 3; F(2) = ${4 * n} + 3 = ${4 * n + 3}.`,
        ),
      (n) =>
        s(
          2 + n * (3 - 1),
          `Com derivada constante ${n}, F(3) − F(1) = ${n} × (3 − 1) = ${2 * n}.`,
          `F(3) = 2 + ${2 * n} = ${2 * n + 2}.`,
        ),
      (n) =>
        s(
          2 ** 3 + n,
          `Primitiva: F(x) = x³ + C.`,
          `F(0) = ${n} dá C = ${n}; F(2) = 8 + ${n} = ${8 + n}.`,
        ),
      (n) =>
        s(
          1 ** 2 + n * 1,
          `Integre: F(x) = x² + ${n}x + C.`,
          `F(0) = 0 dá C = 0; F(1) = 1 + ${n} = ${n + 1}.`,
        ),
      (n) =>
        s(
          2 ** 2 - 1 ** 2 + n,
          `Primitiva: F(x) = x² + C.`,
          `F(1) = ${n} dá C = ${n - 1}; F(2) = 4 + ${n - 1} = ${n + 3}.`,
        ),
      (n) =>
        s(
          n * (0 - 2),
          `Derivada constante: F(0) − F(2) = ${n} × (0 − 2).`,
          `Como F(2) = 0, F(0) = ${-2 * n}.`,
        ),
      (n) =>
        s(
          n ** 3 - 1,
          `Primitiva: F(x) = x³ + C.`,
          `F(1) = 0 dá C = −1; F(${n}) = ${n ** 3} − 1 = ${n ** 3 - 1}.`,
        ),
      (n) =>
        s(
          2 ** 2 + n * 2,
          `Uma primitiva é x² + ${n}x + C.`,
          `Na diferença, C cancela: (4 + ${2 * n}) − 0 = ${4 + 2 * n}.`,
        ),
    ],
    [
      (n) =>
        s(
          (n + 1) ** 2 - 1 ** 2,
          `Uma primitiva de 2x é x².`,
          `Avalie superior menos inferior: ${n + 1}² − 1² = ${(n + 1) ** 2 - 1}.`,
        ),
      (n) =>
        s(
          n * (2 - 0),
          `A primitiva da constante ${n} é ${n}x.`,
          `Entre 0 e 2: ${n} × (2 − 0) = ${2 * n}.`,
        ),
      (n) => s(n ** 3 - 0, `Uma primitiva de 3x² é x³.`, `Entre 0 e ${n}: ${n}³ − 0³ = ${n ** 3}.`),
      (n) =>
        s(
          n * (0 - 2),
          `A integral da constante é constante × (limite superior − inferior).`,
          `${n} × (0 − 2) = ${-2 * n}.`,
        ),
      (n) =>
        s(
          2 * n + 2 * (n + 2 - n),
          `Primeiro intervalo: 2 × (${n} − 0) = ${2 * n}.`,
          `Segundo: 2 × (${n + 2} − ${n}) = 4; soma = ${2 * n + 4}.`,
        ),
      (n) =>
        s(
          0,
          `Limites iguais dão F(${n}) − F(${n}) = 0.`,
          `Não há comprimento de intervalo; a integral vale 0.`,
        ),
      (n) =>
        s(
          0 ** 2 - n ** 2,
          `Primitiva de 2x: x².`,
          `Superior menos inferior: 0² − ${n}² = ${-n * n}.`,
        ),
      (n) =>
        s(
          n ** 4 / 4 - (-n) ** 4 / 4,
          `Primitiva de x³: x⁴/4.`,
          `Nos extremos: ${n}⁴/4 − (−${n})⁴/4 = ${f(n ** 4 / 4)} − ${f(n ** 4 / 4)} = 0.`,
        ),
    ],
    [
      (n) =>
        s(
          n * n,
          `A região é um triângulo de base ${n} e altura ${2 * n}.`,
          `Área: ${n} × ${2 * n} ÷ 2 = ${n * n}.`,
        ),
      (n) =>
        s(
          (n + 2 - 2) * 3,
          `Altura entre curvas: ${n + 2} − 2 = ${n}.`,
          `Área: ${n} × (3 − 0) = ${3 * n}.`,
        ),
      (n) =>
        s(
          Math.abs(-n) * 2,
          `Área geométrica usa altura positiva |−${n}| = ${n}.`,
          `Área: ${n} × 2 = ${2 * n}; a integral assinada seria negativa.`,
        ),
      (n) =>
        s(
          (2 * n * (2 * n)) / 2,
          `Triângulo de base ${2 * n} e altura ${2 * n}.`,
          `Área: ${2 * n} × ${2 * n} ÷ 2 = ${2 * n * n}.`,
        ),
      (n) =>
        s(
          (n + 4 - n) * (3 - 1),
          `Altura: ${n + 4} − ${n} = 4; largura: 3 − 1 = 2.`,
          `Área = 4 × 2 = 8.`,
        ),
      (n) =>
        s(
          2 * ((n * n) / 2),
          `Em cada lado do zero há um triângulo de base e altura ${n}.`,
          `Cada área = ${n} × ${n}/2 = ${f((n * n) / 2)}; total = ${n * n}.`,
        ),
      (n) =>
        s(
          (2 * (2 * n)) / 2,
          `Base = 2; altura em x = 2: ${n} × 2 = ${2 * n}.`,
          `Área do triângulo = 2 × ${2 * n}/2 = ${2 * n}.`,
        ),
      (n) =>
        s(
          n * (5 - 2),
          `Largura = 5 − 2 = 3; altura = ${n}.`,
          `Área do retângulo = 3 × ${n} = ${3 * n}.`,
        ),
    ],
    [
      (n) =>
        s(
          n * 1 ** 2 + 4 * 1,
          `Primitiva: ${n}x² + 4x.`,
          `Em 1 menos em 0: (${n} + 4) − 0 = ${n + 4}.`,
        ),
      (n) =>
        s(
          2 ** 3 + n * 2,
          `Primitiva: x³ + ${n}x.`,
          `Em 2 menos em 0: 8 + ${2 * n} = ${8 + 2 * n}.`,
        ),
      (n) =>
        s(n * 1 ** 3 - 1 ** 2, `Primitiva: ${n}x³ − x².`, `Em 1 menos em 0: ${n} − 1 = ${n - 1}.`),
      (n) =>
        s(n ** 2 + n, `Primitiva: x² + x.`, `Em ${n} menos em 0: ${n * n} + ${n} = ${n * n + n}.`),
      (n) =>
        s(
          n / 3 + 3,
          `Primitiva: (${n}/3)x³ + 3x.`,
          `Em 1 menos em 0: ${n}/3 + 3 ${relation(n / 3 + 3)} ${f(n / 3 + 3)}.`,
        ),
      (n) =>
        s(
          (n * 2 ** 2) / 2 - 2,
          `Primitiva: (${n}/2)x² − x.`,
          `Em 2 menos em 0: ${2 * n} − 2 = ${2 * n - 2}.`,
        ),
      (n) =>
        s((4 * n) / 4, `Primitiva de ${4 * n}x³: ${n}x⁴.`, `Em 1 menos em 0: ${n} × 1 − 0 = ${n}.`),
      (n) =>
        s(
          n * n + 2 * n,
          `Primitiva: x² + 2x.`,
          `Em ${n} menos em 0: ${n * n} + ${2 * n} = ${n * n + 2 * n}.`,
        ),
    ],
    [
      (n) =>
        s(
          n * n * 2,
          `Discos: V/π = integral do raio².`,
          `Raio constante ${n}: V/π = ${n}² × 2 = ${2 * n * n}.`,
        ),
      (n) =>
        s(
          (3 * n) ** 3 / 3,
          `Discos: V/π = ∫ x² dx, de 0 a ${3 * n}.`,
          `Primitiva x³/3: ${3 * n}³/3 = ${9 * n ** 3}.`,
        ),
      (n) =>
        s(
          ((n + 1) ** 2 - n * n) * 2,
          `Área da arruela/π: ${n + 1}² − ${n}² = ${2 * n + 1}.`,
          `Multiplique pelo comprimento 2: ${4 * n + 2}.`,
        ),
      (n) =>
        s(1 ** 2 * (n + 3), `Raio 1 e comprimento ${n + 3}.`, `V/π = 1² × ${n + 3} = ${n + 3}.`),
      (n) => s(n * n * 3, `Cilindro: V/π = raio² × altura.`, `${n}² × 3 = ${3 * n * n}.`),
      (n) =>
        s(
          (4 * n ** 3) / 3,
          `Discos: raio² = (2x)² = 4x².`,
          `Primitiva: 4x³/3; entre 0 e ${n}: 4 × ${n ** 3}/3 ${relation((4 * n ** 3) / 3)} ${f((4 * n ** 3) / 3)}.`,
        ),
      (n) =>
        s(
          (3 ** 2 - 1 ** 2) * n,
          `Arruela: raio externo² − interno² = 3² − 1² = 8.`,
          `V/π = 8 × ${n} = ${8 * n}.`,
        ),
      (n) => s((n * n * 6) / 3, `Cone: V/π = raio² × altura/3.`, `${n}² × 6/3 = ${2 * n * n}.`),
    ],
    [
      (n) =>
        s(
          (2 * n) ** 2 / 2,
          `Primitiva de x: x²/2.`,
          `Entre 0 e ${2 * n}: ${2 * n}²/2 = ${2 * n * n}.`,
        ),
      (n) =>
        s(
          (n + 1) ** 2 - 1,
          `Primitiva de 2x: x².`,
          `Entre 1 e ${n + 1}: ${(n + 1) ** 2} − 1 = ${n * n + 2 * n}.`,
        ),
      (n) =>
        s(
          (n * 2 ** 2) / 2 + 2,
          `Primitiva: (${n}/2)x² + x.`,
          `Em 2 menos em 0: ${2 * n} + 2 = ${2 * n + 2}.`,
        ),
      (n) =>
        s(
          2 * n * 1 - 1 ** 2,
          `Primitiva: ${2 * n}x − x².`,
          `Em 1 menos em 0: ${2 * n} − 1 = ${2 * n - 1}.`,
        ),
      (n) =>
        s(
          ((n + 2) ** 2 - n ** 2) / 2,
          `Primitiva: x²/2.`,
          `Superior menos inferior: (${(n + 2) ** 2} − ${n * n})/2 = ${2 * n + 2}.`,
        ),
      (n) =>
        s(
          (n * n) / 2 + n * n,
          `Primitiva: x²/2 + ${n}x.`,
          `Em ${n} menos em 0: ${f((n * n) / 2)} + ${n * n} = ${f(1.5 * n * n)}.`,
        ),
      (n) =>
        s(
          (-n * 2 ** 2) / 2,
          `Primitiva: −(${n}/2)x².`,
          `Entre 0 e 2: −${n} × 4/2 = ${-2 * n}; a integral é assinada.`,
        ),
      (n) =>
        s(
          n * (3 - 1),
          `Primitiva da constante: ${n}x.`,
          `Superior menos inferior: ${3 * n} − ${n} = ${2 * n}.`,
        ),
    ],
  ],
  calculus3: [
    [
      (n) => s(n * n + 2, `Substitua (x,y) = (${n},2).`, `${n}² + 2 = ${n * n + 2}.`),
      (n) => s(n * -2, `Substitua (x,y) = (${n},−2).`, `${n} × (−2) = ${-2 * n}.`),
      (n) =>
        s(n + 4 - 2 ** 2, `Substitua x = ${n + 4}, y = 2.`, `${n + 4} − 2² = ${n + 4} − 4 = ${n}.`),
      (n) => s(2 * n + 3, `Substitua: 2 × ${n} + 3 × 1.`, `${2 * n} + 3 = ${2 * n + 3}.`),
      (n) =>
        s((-n) ** 2 + n * n, `Substitua: (−${n})² + ${n}².`, `${n * n} + ${n * n} = ${2 * n * n}.`),
      () =>
        s(
          0,
          `Em x/y, a divisão exige y ≠ 0.`,
          `Assim y = 0 é o valor proibido, qualquer que seja x.`,
        ),
      (n) =>
        s(
          (n + 1) * 2 - n * 2,
          `f(${n + 1},2) = ${2 * n + 2}; f(${n},2) = ${2 * n}.`,
          `Diferença: ${2 * n + 2} − ${2 * n} = 2.`,
        ),
      (n) =>
        s(
          n + 3 - (n + 1),
          `Substitua as três coordenadas: ${n} + 3 − ${n + 1}.`,
          `${n + 3} − ${n + 1} = 2.`,
        ),
    ],
    [
      (n) =>
        s(
          2 * 1 * n,
          `Derivando em x, y é constante: ∂f/∂x = 2xy.`,
          `Em (1,${n}): 2 × 1 × ${n} = ${2 * n}.`,
        ),
      () =>
        s(2 * 3, `Derivando em y, o termo em x é constante: ∂f/∂y = 2y.`, `Em (2,3): 2 × 3 = 6.`),
      (n) => s(2 + n, `Derivando em x: ∂f/∂x = y + ${n}.`, `Em (1,2): 2 + ${n} = ${n + 2}.`),
      (n) =>
        s(
          3 * n * n,
          `Derivando em x: ∂f/∂x = 3x²; y é constante.`,
          `Em (${n},1): 3 × ${n}² = ${3 * n * n}.`,
        ),
      (n) => s(n * 3, `Derivando em x: ∂f/∂x = ${n}y.`, `Em (2,3): ${n} × 3 = ${3 * n}.`),
      () =>
        s(
          2 * 2,
          `Em relação a x, o termo em y tem derivada zero.`,
          `∂f/∂x = 2x; em (2,1): 2 × 2 = 4.`,
        ),
      (n) =>
        s(n * n, `Derivando em y, x² é coeficiente: ∂f/∂y = x².`, `Em (${n},2): ${n}² = ${n * n}.`),
      (n) =>
        s(
          6 * 1 ** 2 * n,
          `Primeiro em x: ∂f/∂x = 3x²y².`,
          `Depois em y: ∂²f/∂y∂x = 6x²y.`,
          `Em (1,${n}): 6 × 1² × ${n} = ${6 * n}.`,
        ),
    ],
    [
      (n) => s(2 * n, `∇f = (2x, 2y).`, `A componente x em (${n},1) é 2 × ${n} = ${2 * n}.`),
      (n) => s(n, `Para f = xy, ∇f = (y,x).`, `A componente y em (${n},2) é x = ${n}.`),
      (n) => s(n, `∇f = (3,${n}).`, `A componente y é ${n}.`),
      (n) => s(4 * n, `∇f = (2x,4y).`, `A componente y em (1,${n}) é 4 × ${n} = ${4 * n}.`),
      (n) =>
        s(
          Math.sqrt((2 * n) ** 2),
          `∇f = (2x,2y); em (${n},0): (${2 * n},0).`,
          `Norma = √(${2 * n}² + 0²) = ${2 * n}.`,
        ),
      (n) => s(3, `O gradiente é (${n},3).`, `Produto por u = (0,1): ${n} × 0 + 3 × 1 = 3.`),
      (n) =>
        s(
          2 * n * -1,
          `∇f(${n},0) = (${2 * n},0).`,
          `Produto por u = (−1,0): ${2 * n} × (−1) + 0 × 0 = ${-2 * n}.`,
        ),
      (n) => s(n, `∇f = (${n},${n}).`, `A componente x é ${n}, sem somar as componentes.`),
    ],
    [
      (n) =>
        s(
          n * 2 + 2 * 1 + 1 * 3,
          `Produto escalar: ${n} × 2 + 2 × 1 + 1 × 3.`,
          `${2 * n} + 2 + 3 = ${2 * n + 5}.`,
        ),
      (n) =>
        s(
          n * 1 + 1 * -n + 0 * 2,
          `Produto escalar: ${n} × 1 + 1 × (−${n}) + 0 × 2.`,
          `${n} − ${n} + 0 = 0.`,
        ),
      (n) =>
        s(
          n * n + 0 * 2 + 1 * -1,
          `Produto escalar: ${n} × ${n} + 0 × 2 + 1 × (−1).`,
          `${n * n} − 1 = ${n * n - 1}.`,
        ),
      (n) =>
        s(
          1 * n + 2 * n + 3 * n,
          `Produto escalar: 1 × ${n} + 2 × ${n} + 3 × ${n}.`,
          `${n} + ${2 * n} + ${3 * n} = ${6 * n}.`,
        ),
      (n) =>
        s(
          n * 2 + 2 * -n + 0 * 1,
          `Multiplique componentes correspondentes: ${n} × 2 + 2 × (−${n}) + 0 × 1.`,
          `${2 * n} − ${2 * n} + 0 = 0.`,
        ),
      (n) => s(n * n, `u·u = ${n} × ${n} + 0² + 0².`, `Resultado = ${n * n}.`),
      (n) =>
        s(
          (1 * n + 2 * 0 + 3 * 0) / n,
          `Produto: 1 × ${n} + 2 × 0 + 3 × 0 = ${n}.`,
          `Divida por ${n} ≠ 0: ${n}/${n} = 1.`,
        ),
      (n) => s(n * 0 + 2 * 0 + 1 * 1, `Produto: ${n} × 0 + 2 × 0 + 1 × 1.`, `0 + 0 + 1 = 1.`),
    ],
    [
      (n) =>
        s(
          n + 2 + 3,
          `Divergência = ∂Fx/∂x + ∂Fy/∂y + ∂Fz/∂z.`,
          `Derivadas: ${n}, 2 e 3; soma = ${n + 5}.`,
        ),
      (n) =>
        s(
          2 * n + 2 * 1 + 2 * 1,
          `div F = 2x + 2y + 2z.`,
          `Em (${n},1,1): ${2 * n} + 2 + 2 = ${2 * n + 4}.`,
        ),
      () => s(0 + 0 + 0, `∂y/∂x = 0; ∂z/∂y = 0; ∂x/∂z = 0.`, `Divergência = 0 + 0 + 0 = 0.`),
      (n) =>
        s(
          n - n + 1,
          `Derive cada componente em sua variável: ${n}, ${-n} e 1.`,
          `Divergência = ${n} − ${n} + 1 = 1.`,
        ),
      (n) => s(2 * 2 + n + 1, `div F = 2x + ${n} + 1.`, `Em (2,1,1): 4 + ${n} + 1 = ${n + 5}.`),
      () =>
        s(
          0 + 0 + 0,
          `Cada componente independe da variável em que seria derivada.`,
          `As três derivadas são zero; div F = 0.`,
        ),
      (n) =>
        s(
          n + n - 2 * n,
          `As derivadas são ${n}, ${n} e ${-2 * n}.`,
          `Soma: ${n} + ${n} − ${2 * n} = 0.`,
        ),
      () => s(1 + 1 + 1, `∂x/∂x = ∂y/∂y = ∂z/∂z = 1.`, `div F = 1 + 1 + 1 = 3 em qualquer ponto.`),
    ],
    [
      (n) =>
        s(
          2 * n,
          `Integral interna: ∫₀² 1 dy = 2.`,
          `Integral externa: ∫₀^${n} 2 dx = 2 × ${n} = ${2 * n}.`,
        ),
      (n) =>
        s(
          (n * 2 ** 2) / 2,
          `Integre em y mantendo x constante: ∫₀^${n} x dy = ${n}x.`,
          `Depois em x: [${n}x²/2]₀² = ${2 * n}.`,
        ),
      (n) =>
        s(
          ((n * 2 ** 2) / 2) * 1,
          `Primitiva interna: (${n}/2)y².`,
          `Entre 0 e 2 dá ${2 * n}; integre em x de 0 a 1: ${2 * n} × 1 = ${2 * n}.`,
        ),
      (n) =>
        s(
          2 * n * 3,
          `Área do retângulo: ${n} × 3 = ${3 * n}.`,
          `Integral da constante 2: 2 × ${3 * n} = ${6 * n}.`,
        ),
      (n) =>
        s(
          ((n * n) / 2) * 2,
          `Integre y em y: [y²/2]₀^${n} = ${f((n * n) / 2)}.`,
          `Integre essa constante em x de 0 a 2: ${f((n * n) / 2)} × 2 = ${n * n}.`,
        ),
      (n) =>
        s(
          (n * n) / 2 + n,
          `Integral interna em y de 0 a 1: x + 1.`,
          `Integral externa: [x²/2 + x]₀^${n} = ${f((n * n) / 2)} + ${n} = ${f((n * n) / 2 + n)}.`,
        ),
      (n) =>
        s(
          -3 * 2 * n,
          `Área do domínio: 2 × ${n} = ${2 * n}.`,
          `Integral assinada da constante −3: −3 × ${2 * n} = ${-6 * n}.`,
        ),
      (n) =>
        s(
          n / 2 + n * n,
          `Integral interna: [xy + y²]₀^${n} = ${n}x + ${n * n}.`,
          `Integral externa de 0 a 1: ${n}/2 + ${n * n} = ${f(n / 2 + n * n)}.`,
        ),
    ],
  ],
};

/** Soluções autorais offline do banco revisão 3; nunca avalia uma tentativa. */
export function mathReviewExplanation(course: MathCourseId, q: MasteryQuestion): string[] {
  const final = q.seed > 288;
  const level = final ? Math.floor((q.seed - 289) / 24) : Math.floor((q.seed - 1) / 48);
  const index = final ? (q.seed - 289) % 24 : (q.seed - 1) % 48;
  const format = final ? 4 + Math.floor(index / 6) : Math.floor(index / 6);
  const n = (index % 6) + (final ? 8 : 2);
  const id = final
    ? `${course}:${level}:final:${index}`
    : index < 24
      ? `${course}:${level}:${index}`
      : `${course}:${level}:extra:${index - 24}`;
  if (
    q.revision !== 3 ||
    !Number.isInteger(q.seed) ||
    q.seed < 1 ||
    level > 5 ||
    q.id !== id ||
    q.format !== format ||
    (q.phase === "final") !== final
  ) {
    throw new Error("Questão fora do banco de soluções revisão 3.");
  }
  const solve = SOLUTIONS[course]?.[level]?.[format];
  if (!solve) throw new Error("Formato sem solução cadastrada.");
  // As três adaptações históricas substituem apenas os índices 0, 1 e 2.
  const exponent = [13, -1.5, 2.4][index];
  const result =
    course === "calculus1" && level === 2 && !final && index < 3
      ? s(
          exponent!,
          `Regra da potência: d(x^a)/dx = a × x^(a−1).`,
          `Com a = ${f(exponent!)}, f′(x) = ${f(exponent!)} × x^(${f(exponent! - 1)}).`,
          `Em x = 1: ${f(exponent!)} × 1 = ${f(exponent!)}.`,
        )
      : solve(n);
  const rounded = Number(result.value.toFixed(2));
  if (!Number.isFinite(result.value) || rounded !== q.answer)
    throw new Error("A solução não confere com o snapshot da questão.");
  return [
    ...result.steps,
    ...(Math.abs(result.value - rounded) > 1e-9
      ? [`Arredondando apenas a resposta para duas casas decimais: ${f(rounded)}.`]
      : []),
    `Fonte da questão: ${q.source}`,
    `Resposta: ${f(rounded)}.`,
  ];
}
