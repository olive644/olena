// Textos de teste escritos para esta validação (originais, sem direitos de terceiros). Cada texto
// traz a lista de trechos que um bom resumo precisa conter ("ouro") e o que nunca pode aparecer.

export type FixtureBlock =
  { kind: "heading"; level: 1 | 2 | 3; text: string } | { kind: "paragraph"; text: string };

export type Fixture = {
  name: string;
  title: string;
  blocks: FixtureBlock[];
  /** Trechos que o resumo deve conter, comparados sem acento e sem diferença de caixa. */
  gold: string[];
  /** Trechos que não podem aparecer (cabeçalho, rodapé, referências, números de página). */
  forbidden: string[];
};

const h = (level: 1 | 2 | 3, text: string): FixtureBlock => ({ kind: "heading", level, text });
const p = (text: string): FixtureBlock => ({ kind: "paragraph", text });

export const computingHistory: Fixture = {
  name: "historia-da-computacao",
  title: "História da Computação",
  blocks: [
    h(1, "1. Antes dos computadores"),
    p(
      "Durante séculos, as pessoas fizeram contas com instrumentos simples. O ábaco é um instrumento de cálculo formado por hastes e contas, usado há mais de 2000 anos na Mesopotâmia, na China e em Roma. Ele permitia somar e subtrair com rapidez, e muitos comerciantes o usaram até o século XX.",
    ),
    p(
      "Em 1642, o francês Blaise Pascal construiu a Pascalina, uma máquina que somava e subtraía por meio de engrenagens. Pascal tinha apenas 19 anos e queria ajudar o pai, que trabalhava como coletor de impostos. A máquina foi vendida em poucas unidades porque era cara e difícil de consertar.",
    ),
    p(
      "No século XIX, o inglês Charles Babbage projetou a Máquina Analítica, considerada a primeira ideia de um computador programável. Ela nunca foi concluída, porque a indústria da época não conseguia fabricar peças com a precisão necessária. Ada Lovelace escreveu instruções para essa máquina e por isso é lembrada como a primeira programadora da história.",
    ),
    p(
      "Um algoritmo é uma sequência finita de passos que resolve um problema. Esse conceito é essencial para entender como os computadores funcionam, pois todo programa é a descrição de um algoritmo. Uma receita de bolo, por exemplo, também é um algoritmo.",
    ),
    h(1, "2. O ENIAC"),
    p(
      "O ENIAC foi concluído em 1945 na Universidade da Pensilvânia, nos Estados Unidos. Ele foi um dos primeiros computadores eletrônicos de uso geral e foi construído para calcular tabelas de tiro da artilharia. Usava cerca de 18 mil válvulas e pesava aproximadamente 30 toneladas.",
    ),
    p(
      "A máquina ocupava uma sala de cerca de 170 metros quadrados e fazia 5 mil somas por segundo, centenas de vezes mais que uma pessoa com uma calculadora mecânica. Ela foi apresentada ao público em 1946 e recebeu muita atenção da imprensa, que a chamou de cérebro eletrônico.",
    ),
    h(2, "2.1 Como o ENIAC era programado"),
    p(
      "A programação era feita por cabos e chaves, que precisavam ser reconectados a cada nova tarefa. Isso levava dias de trabalho de uma equipe, formada em grande parte por mulheres matemáticas. Importante lembrar que o ENIAC não guardava o programa na memória, e por isso cada mudança exigia refazer as ligações.",
    ),
    p(
      "A ideia do programa armazenado, em que as instruções ficam na memória junto com os dados, foi descrita em 1945 por John von Neumann. Os computadores seguintes passaram a usar essa arquitetura, que continua sendo a base das máquinas atuais.",
    ),
    h(1, "3. O transistor"),
    p(
      "O transistor foi inventado em 1947 nos Laboratórios Bell, nos Estados Unidos, por John Bardeen, Walter Brattain e William Shockley. O transistor é um componente eletrônico que amplifica ou liga e desliga sinais elétricos. Os três inventores receberam o Prêmio Nobel de Física em 1956.",
    ),
    p(
      "Ele substituiu as válvulas porque era menor, mais barato, mais durável e consumia muito menos energia. Também esquentava menos, o que permitiu construir máquinas menores e mais confiáveis. Por isso, os computadores da década de 1960 já eram bem menores que o ENIAC.",
    ),
    p(
      "O circuito integrado é um conjunto de transistores e outros componentes fabricados juntos sobre uma pastilha de silício. Ele foi criado em 1958 por Jack Kilby, e depois aperfeiçoado por Robert Noyce. Em 1971, a Intel lançou o 4004, o primeiro microprocessador comercial, com 2.300 transistores em um único chip.",
    ),
    h(1, "4. O computador pessoal"),
    p(
      "Na década de 1970, os microprocessadores tornaram possível fabricar computadores pequenos e baratos. O Altair 8800, lançado em 1975, é lembrado como um dos primeiros computadores pessoais e foi vendido em forma de kit para entusiastas. Em 1976, Steve Jobs e Steve Wozniak fundaram a Apple, que passou a vender computadores já montados.",
    ),
    p(
      "Em 1981, a IBM lançou o IBM PC, que teve uma arquitetura aberta e foi copiada por muitos fabricantes. Isso fez o preço cair e a quantidade de programas disponíveis aumentar. O sistema operacional é o programa que controla o hardware e permite que os outros programas funcionem, e o computador da IBM usava o MS-DOS, da Microsoft.",
    ),
    p(
      "A interface gráfica, com janelas, ícones e mouse, foi popularizada pelo Macintosh, lançado em 1984. A Microsoft lançou o Windows 1.0 em 1985, e a partir daí o uso de computadores em casas e escritórios cresceu rapidamente. Ficou conhecida como a era em que o computador deixou de ser uma máquina só de especialistas.",
    ),
    h(1, "5. A internet"),
    p(
      "A internet começou como um projeto militar. Em 1969, a ARPANET conectou quatro universidades americanas e enviou sua primeira mensagem entre computadores distantes. A internet é uma rede mundial de computadores interligados que trocam dados por meio de protocolos padronizados, como o TCP/IP, adotado em 1983.",
    ),
    p(
      "Em 1989, Tim Berners-Lee propôs no CERN a World Wide Web, um sistema de páginas ligadas por links que podem ser acessadas por qualquer pessoa. O navegador Mosaic, de 1993, tornou a web fácil de usar, e nos anos seguintes a rede se espalhou pelo mundo. É importante não confundir a internet, que é a infraestrutura, com a web, que é um serviço que funciona sobre ela.",
    ),
    p(
      "Hoje, mais de 5 bilhões de pessoas usam a internet. Ela mudou a forma de estudar, trabalhar, comprar e se comunicar, e levou o computador do escritório para o bolso, com os telefones inteligentes.",
    ),
    h(1, "Referências"),
    p("[1] CERUZZI, P. Computing: A Concise History. MIT Press, 2012. ISBN 978-0262517690."),
    p("[2] ISAACSON, W. Os Inovadores. Companhia das Letras, 2014. p. 45-60."),
  ],
  gold: [
    "ábaco é um instrumento de cálculo",
    "primeira ideia de um computador programável",
    "algoritmo é uma sequência finita de passos",
    "ENIAC foi concluído em 1945",
    "não guardava o programa na memória",
    "transistor é um componente eletrônico",
    "circuito integrado é um conjunto de transistores",
    "primeiro microprocessador comercial",
    "sistema operacional é o programa que controla o hardware",
    "internet é uma rede mundial de computadores",
    "World Wide Web",
    "ARPANET conectou quatro universidades",
  ],
  forbidden: ["ISBN", "Companhia das Letras", "MIT Press", "CERUZZI"],
};

export const photosynthesis: Fixture = {
  name: "fotossintese",
  title: "Fotossíntese",
  blocks: [
    p(
      "A fotossíntese é o processo pelo qual plantas, algas e algumas bactérias transformam energia luminosa em energia química. Nesse processo, elas usam gás carbônico, água e luz para produzir glicose e liberar oxigênio. A fotossíntese sustenta quase todas as cadeias alimentares da Terra.",
    ),
    p(
      "Nas plantas, a fotossíntese acontece principalmente nas folhas, dentro de organelas chamadas cloroplastos. O cloroplasto é a organela que contém a clorofila, pigmento verde que absorve a luz do sol, principalmente nas faixas do vermelho e do azul. A luz verde é pouco absorvida e por isso as folhas parecem verdes.",
    ),
    p(
      "A equação geral da fotossíntese pode ser escrita assim: seis moléculas de gás carbônico mais seis moléculas de água, na presença de luz, produzem uma molécula de glicose e seis moléculas de oxigênio. O oxigênio liberado vem da água e não do gás carbônico, o que foi comprovado em experimentos com isótopos.",
    ),
    p(
      "O processo tem duas etapas. Na fase clara, que ocorre nas membranas dos tilacoides, a energia da luz é usada para quebrar moléculas de água e produzir ATP e NADPH. Nessa fase ocorre a liberação do oxigênio. A fase clara depende diretamente da luz.",
    ),
    p(
      "Na fase escura, também chamada de ciclo de Calvin, o ATP e o NADPH produzidos na fase clara são usados para transformar o gás carbônico em glicose. Ela acontece no estroma do cloroplasto. Apesar do nome, a fase escura não precisa de escuridão: ela apenas não depende diretamente da luz e ocorre também durante o dia.",
    ),
    p(
      "Vários fatores influenciam a velocidade da fotossíntese. A intensidade da luz, a concentração de gás carbônico e a temperatura são os principais. Em geral, a taxa aumenta com a luz até um limite, a partir do qual outros fatores passam a limitar o processo. Temperaturas muito altas desativam enzimas e reduzem a fotossíntese.",
    ),
    p(
      "A glicose produzida é usada pela planta como fonte de energia e como matéria-prima para formar celulose, amido e outras substâncias. O excedente é armazenado na forma de amido, em raízes, caules e sementes. É esse amido que muitos animais, inclusive os seres humanos, usam como alimento.",
    ),
    p(
      "A fotossíntese também regula a composição da atmosfera. Estima-se que os organismos fotossintetizantes produzam cerca de metade do oxigênio que respiramos, e que as algas marinhas respondam por grande parte dessa produção. Por isso, a proteção dos oceanos e das florestas é importante para o equilíbrio do planeta.",
    ),
    p(
      "A respiração celular faz o caminho oposto: consome glicose e oxigênio e libera gás carbônico, água e energia. As plantas realizam as duas coisas, mas durante o dia a fotossíntese costuma ser maior que a respiração, e por isso elas liberam oxigênio para o ambiente.",
    ),
  ],
  gold: [
    "fotossíntese é o processo pelo qual plantas, algas e algumas bactérias",
    "cloroplasto é a organela que contém a clorofila",
    "O oxigênio liberado vem da água",
    "fase clara",
    "ciclo de Calvin",
    "a taxa aumenta com a luz até um limite",
    "armazenado na forma de amido",
    "respiração celular faz o caminho oposto",
  ],
  forbidden: [],
};

export const shortNote: Fixture = {
  name: "nota-curta",
  title: "Nota sobre o Sol",
  blocks: [
    p(
      "O Sol é a estrela no centro do Sistema Solar. Ele contém cerca de 99,8% da massa de todo o sistema e fornece a luz e o calor que sustentam a vida na Terra. A luz do Sol leva cerca de 8 minutos para chegar até nós. Sua superfície tem temperatura próxima de 5.500 graus Celsius.",
    ),
  ],
  gold: ["O Sol é a estrela no centro do Sistema Solar"],
  forbidden: [],
};

export function fixtureAsText(fixture: Fixture): string {
  return fixture.blocks
    .map((block) =>
      block.kind === "heading" ? `${"#".repeat(block.level)} ${block.text}` : block.text,
    )
    .join("\n\n");
}
