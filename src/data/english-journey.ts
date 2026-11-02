import { uiText } from "../i18n/runtime";

// Original dialogues. Target English stays English in either interface language.
export const ENGLISH_JOURNEY = [
  {
    title: "Café no porto",
    objective: "Entender e fazer um pedido simples.",
    scenes: [
      [
        "I'd like a coffee, please.",
        "Eu gostaria de um café, por favor.",
        "Here is your coffee.",
        "coffee",
      ],
      [
        "A tea without sugar, please.",
        "Um chá sem açúcar, por favor.",
        "Of course. No sugar.",
        "sugar",
      ],
      ["Can I have some water?", "Posso tomar um pouco de água?", "Yes. Here you are.", "water"],
      ["How much is the sandwich?", "Quanto custa o sanduíche?", "It is five pounds.", "sandwich"],
      [
        "A small juice, please.",
        "Um suco pequeno, por favor.",
        "One small juice. Anything else?",
        "small",
      ],
      ["That's all, thank you.", "É só isso, obrigado.", "You're welcome!", "thank"],
    ],
  },
  {
    title: "Primeiros encontros",
    objective: "Cumprimentar e se apresentar.",
    scenes: [
      ["Hello! My name is Olena.", "Olá! Meu nome é Olena.", "Hi, Olena! I'm Oliver.", "name"],
      ["What is your name?", "Qual é o seu nome?", "My name is Oliver.", "your"],
      ["Nice to meet you.", "Prazer em conhecer você.", "Nice to meet you too.", "meet"],
      ["Where are you from?", "De onde você é?", "I'm from Brazil.", "from"],
      ["How are you today?", "Como você está hoje?", "I'm fine, thanks.", "today"],
      ["See you tomorrow!", "Até amanhã!", "See you!", "tomorrow"],
    ],
  },
  {
    title: "Caminhos da ilha",
    objective: "Pedir ajuda e entender direções curtas.",
    scenes: [
      ["Where is the library?", "Onde fica a biblioteca?", "It is next to the cafe.", "library"],
      [
        "Turn left at the bridge.",
        "Vire à esquerda na ponte.",
        "Left at the bridge. Thank you!",
        "left",
      ],
      [
        "Go straight to the square.",
        "Siga em frente até a praça.",
        "Straight ahead. Got it!",
        "straight",
      ],
      [
        "Is the school near here?",
        "A escola fica perto daqui?",
        "Yes, it is a short walk.",
        "near",
      ],
      [
        "The shop is on your right.",
        "A loja fica à sua direita.",
        "Thank you for your help.",
        "right",
      ],
      [
        "Can you help me, please?",
        "Você pode me ajudar, por favor?",
        "Of course. What do you need?",
        "help",
      ],
    ],
  },
  {
    title: "Uma mochila de descobertas",
    objective: "Reconhecer objetos, quantidades e cores.",
    scenes: [
      ["I have two books.", "Eu tenho dois livros.", "Can I borrow one?", "two"],
      ["This is my yellow bag.", "Esta é minha bolsa amarela.", "It is a lovely bag.", "yellow"],
      ["Do you have a pencil?", "Você tem um lápis?", "Yes. You can use mine.", "pencil"],
      [
        "These are three red apples.",
        "Estas são três maçãs vermelhas.",
        "Let's share the apples.",
        "three",
      ],
      [
        "The notebook is on the table.",
        "O caderno está sobre a mesa.",
        "I can see it. Thanks!",
        "table",
      ],
      ["That blue pen is mine.", "Aquela caneta azul é minha.", "Here is your pen.", "blue"],
    ],
  },
  {
    title: "O ritmo do dia",
    objective: "Conversar sobre horários e rotina.",
    scenes: [
      ["I study in the morning.", "Eu estudo de manhã.", "I study in the afternoon.", "morning"],
      ["What time is it?", "Que horas são?", "It is nine o'clock.", "time"],
      ["The lesson starts at ten.", "A aula começa às dez.", "Let's get ready.", "ten"],
      [
        "I walk to school every day.",
        "Eu vou a pé para a escola todos os dias.",
        "I walk to school too.",
        "walk",
      ],
      ["We have lunch at noon.", "Nós almoçamos ao meio-dia.", "Let's meet at noon.", "lunch"],
      ["I read before bed.", "Eu leio antes de dormir.", "What do you like to read?", "read"],
    ],
  },
  {
    title: "Um convite para explorar",
    objective: "Expressar preferências e combinar um encontro.",
    scenes: [
      ["Do you like music?", "Você gosta de música?", "Yes, I love music.", "music"],
      [
        "I don't like cold coffee.",
        "Eu não gosto de café frio.",
        "Would you like some hot tea?",
        "cold",
      ],
      ["Let's visit the island.", "Vamos visitar a ilha.", "Great idea!", "visit"],
      [
        "Are you free on Saturday?",
        "Você está livre no sábado?",
        "Yes. Let's meet in the morning.",
        "Saturday",
      ],
      [
        "I prefer tea to coffee.",
        "Eu prefiro chá a café.",
        "A cup of tea for you, then.",
        "prefer",
      ],
      ["Can we meet at the cafe?", "Podemos nos encontrar no café?", "Yes. See you there!", "meet"],
    ],
  },
] as const;

export type EnglishQuestion = {
  id: number;
  kind: "meaning" | "gap" | "reply" | "order";
  phrase: string;
  prompt: string;
  answer: string;
  options: string[];
  meaning: string;
  replyMeaning: string;
};
const REPLY_MEANINGS = [
  [
    "Aqui está seu café.",
    "Claro. Sem açúcar.",
    "Sim. Aqui está.",
    "Custa cinco libras.",
    "Um suco pequeno. Mais alguma coisa?",
    "De nada!",
  ],
  [
    "Oi, Olena! Eu sou Oliver.",
    "Meu nome é Oliver.",
    "Prazer em conhecer você também.",
    "Eu sou do Brasil.",
    "Estou bem, obrigado.",
    "Até mais!",
  ],
  [
    "Fica ao lado do café.",
    "À esquerda na ponte. Obrigado!",
    "Em frente. Entendi!",
    "Sim, é uma caminhada curta.",
    "Obrigado pela ajuda.",
    "Claro. Do que você precisa?",
  ],
  [
    "Posso pegar um emprestado?",
    "É uma bolsa linda.",
    "Sim. Você pode usar o meu.",
    "Vamos dividir as maçãs.",
    "Estou vendo. Obrigado!",
    "Aqui está sua caneta.",
  ],
  [
    "Eu estudo à tarde.",
    "São nove horas.",
    "Vamos nos preparar.",
    "Eu também vou a pé para a escola.",
    "Vamos nos encontrar ao meio-dia.",
    "O que você gosta de ler?",
  ],
  [
    "Sim, eu adoro música.",
    "Você gostaria de um chá quente?",
    "Ótima ideia!",
    "Sim. Vamos nos encontrar de manhã.",
    "Então, uma xícara de chá para você.",
    "Sim. Até lá!",
  ],
] as const;
export function englishQuestion(part: number, id: number): EnglishQuestion {
  const scenes = ENGLISH_JOURNEY[part]!.scenes;
  const scene = Math.floor(id / 4);
  const [phrase, translation, reply, word] = scenes[scene]!;
  const kind = (["meaning", "gap", "reply", "order"] as const)[id % 4]!;
  const meaning = uiText(translation);
  const answer =
    kind === "meaning" ? meaning : kind === "gap" ? word : kind === "reply" ? reply : phrase;
  const others = [1, 2].map((offset) => scenes[(scene + offset) % scenes.length]!);
  const options = [
    answer,
    ...others.map((item) =>
      kind === "meaning" ? uiText(item[1]) : kind === "gap" ? item[3] : item[2],
    ),
  ];
  // Stable rotation avoids placing every correct choice first.
  const rotation = (part + id) % 3;
  return {
    id,
    kind,
    phrase,
    meaning,
    replyMeaning: uiText(REPLY_MEANINGS[part]![scene]!),
    answer,
    options: [...options.slice(rotation), ...options.slice(0, rotation)],
    prompt:
      kind === "meaning"
        ? uiText("O que foi dito?")
        : kind === "gap"
          ? uiText("Complete a fala.")
          : kind === "reply"
            ? uiText("Como Oliver pode responder?")
            : uiText("Monte a fala em inglês."),
  };
}
export function normalizeEnglish(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.!?,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
