import { localizeResource } from "../i18n/runtime.js";

export const CONTROL_LEVELS = ["total-controlled", "semi-controlled"] as const;
export type ControlLevel = (typeof CONTROL_LEVELS)[number];

export const CONTROL_LEVEL_LABELS: Record<ControlLevel, string> = {
  "total-controlled": "Total Controlled",
  "semi-controlled": "Semi Controlled",
};

export type ActivityDefinition = {
  id: string;
  name: string;
  controlLevel: ControlLevel;
  time: number;
  topic: string;
  steps: string[];
  goal: string;
  supplies: string[];
  links: string[];
};

export const ACTIVITY_LIBRARY: ActivityDefinition[] = localizeResource([
  {
    id: "bingo",
    name: "Bingo",
    controlLevel: "total-controlled",
    time: 10,
    topic: "Vocabulário revisado",
    steps: [
      "Distribua cartelas com o vocabulário da aula.",
      "Chame os itens em voz alta, um de cada vez.",
      "Confirme o primeiro aluno que completar uma linha.",
    ],
    goal: "Reconhecer o vocabulário da aula de forma rápida.",
    supplies: ["Cartelas de bingo", "Marcadores"],
    links: [],
  },
  {
    id: "swat",
    name: "Swat",
    controlLevel: "total-controlled",
    time: 8,
    topic: "Vocabulário revisado",
    steps: [
      "Espalhe cartões com o vocabulário no quadro ou na mesa.",
      "Divida a turma em duplas com um matamosca cada.",
      "Diga a palavra ou mostre a imagem; a dupla mais rápida acerta o cartão.",
    ],
    goal: "Associar rapidamente palavra e significado.",
    supplies: ["Cartões de vocabulário", "Matamosca (ou papel enrolado)"],
    links: [],
  },
  {
    id: "mimic",
    name: "Mimic",
    controlLevel: "total-controlled",
    time: 8,
    topic: "Verbos e ações",
    steps: [
      "Um aluno recebe uma palavra secreta em silêncio.",
      "O aluno mima a palavra sem falar.",
      "A turma tenta adivinhar em inglês.",
    ],
    goal: "Reconhecer e produzir vocabulário de ações.",
    supplies: ["Cartões com verbos de ação"],
    links: [],
  },
  {
    id: "swatters",
    name: "Swatters",
    controlLevel: "total-controlled",
    time: 8,
    topic: "Vocabulário revisado",
    steps: [
      "Fixe imagens do vocabulário na parede ou no quadro.",
      "Dois alunos ficam de costas para as imagens.",
      "Ao ouvir a palavra, viram-se e tocam a imagem correta primeiro.",
    ],
    goal: "Reagir rapidamente ao vocabulário ouvido.",
    supplies: ["Imagens do vocabulário", "Fita adesiva"],
    links: [],
  },
  {
    id: "labels-and-images",
    name: "Labels and Images",
    controlLevel: "total-controlled",
    time: 10,
    topic: "Vocabulário novo",
    steps: [
      "Distribua etiquetas com as palavras e imagens soltas.",
      "Peça para os alunos parearem cada etiqueta com a imagem correta.",
      "Corrija coletivamente no quadro.",
    ],
    goal: "Fixar a forma escrita do vocabulário novo.",
    supplies: ["Etiquetas de palavras", "Imagens impressas"],
    links: [],
  },
  {
    id: "whats-missing",
    name: "What's Missing",
    controlLevel: "total-controlled",
    time: 8,
    topic: "Vocabulário revisado",
    steps: [
      "Mostre um conjunto de imagens ou objetos por alguns segundos.",
      "Cubra o conjunto e remova um item.",
      "Peça para os alunos identificarem o item que sumiu.",
    ],
    goal: "Praticar memória e recuperação lexical.",
    supplies: ["Imagens ou objetos do vocabulário", "Pano para cobrir"],
    links: [],
  },
  {
    id: "chinese-whispers",
    name: "Chinese Whispers",
    controlLevel: "total-controlled",
    time: 10,
    topic: "Estrutura-alvo da aula",
    steps: [
      "Organize a turma em filas.",
      "Sussurre uma frase-alvo para o primeiro aluno de cada fila.",
      "A frase é repassada até o final; compare com a frase original.",
    ],
    goal: "Praticar pronúncia e escuta da estrutura-alvo.",
    supplies: [],
    links: [],
  },
  {
    id: "singing",
    name: "Singing",
    controlLevel: "total-controlled",
    time: 10,
    topic: "Vocabulário ou estrutura da aula",
    steps: [
      "Escolha uma música curta que use o vocabulário ou estrutura da aula.",
      "Distribua a letra com lacunas para completar.",
      "Toque a música e corrija as lacunas em conjunto.",
    ],
    goal: "Praticar pronúncia e reconhecimento auditivo com apoio musical.",
    supplies: ["Áudio da música", "Letra impressa com lacunas"],
    links: [],
  },
  {
    id: "this-or-that",
    name: "This or That",
    controlLevel: "semi-controlled",
    time: 10,
    topic: "Preferências e opinião",
    steps: [
      "Apresente pares de opções ligadas ao tema da aula.",
      "Em duplas, os alunos escolhem e justificam sua preferência.",
      "Alguns pares compartilham as respostas com a turma.",
    ],
    goal: "Expressar preferência com justificativa simples.",
    supplies: ["Lista de pares de opções"],
    links: [],
  },
  {
    id: "draw",
    name: "Draw",
    controlLevel: "semi-controlled",
    time: 12,
    topic: "Descrição de vocabulário ou estrutura",
    steps: [
      "Um aluno descreve um item do vocabulário sem dizer a palavra.",
      "A dupla desenha o que está sendo descrito.",
      "Confira o desenho contra a palavra-alvo.",
    ],
    goal: "Praticar descrição usando a estrutura-alvo.",
    supplies: ["Papel", "Lápis ou canetinha"],
    links: [],
  },
  {
    id: "dictation-draw",
    name: "Dictation Draw",
    controlLevel: "semi-controlled",
    time: 12,
    topic: "Estrutura-alvo da aula",
    steps: [
      "Um aluno dita uma cena usando a estrutura-alvo.",
      "A dupla desenha a cena conforme ouve.",
      "Comparem o desenho com a descrição original.",
    ],
    goal: "Produzir e compreender a estrutura-alvo em contexto.",
    supplies: ["Papel", "Lápis ou canetinha"],
    links: [],
  },
  {
    id: "like-or-dislike",
    name: "Like or Dislike",
    controlLevel: "semi-controlled",
    time: 10,
    topic: "Gostos e preferências",
    steps: [
      "Apresente uma lista de itens relacionados ao tema.",
      "Cada aluno diz se gosta ou não de cada item e por quê.",
      "Encoraje follow-up questions entre os alunos.",
    ],
    goal: "Expressar gostos com justificativa e reagir ao colega.",
    supplies: ["Lista de itens do tema"],
    links: [],
  },
  {
    id: "roleplay-variation",
    name: "RolePlay Variation",
    controlLevel: "semi-controlled",
    time: 15,
    topic: "Situação comunicativa da aula",
    steps: [
      "Distribua cartões de papel com um papel e um objetivo cada.",
      "As duplas representam a situação usando a estrutura-alvo.",
      "Troque os papéis e repita com uma variação da situação.",
    ],
    goal: "Usar a estrutura-alvo em uma situação comunicativa próxima do real.",
    supplies: ["Cartões de papel com os papéis"],
    links: [],
  },
]);

export function findActivity(id: string): ActivityDefinition | undefined {
  return ACTIVITY_LIBRARY.find((activity) => activity.id === id);
}

export function listActivitiesByControlLevel(controlLevel: ControlLevel): ActivityDefinition[] {
  return ACTIVITY_LIBRARY.filter((activity) => activity.controlLevel === controlLevel);
}
