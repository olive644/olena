import type { AppView } from "../components/app-navigation";
import { dueFlashcards, type WorkspaceState } from "./workspace";
import { hasStudyModality } from "./study-preferences";

export type StudyRoute = {
  label: string;
  title: string;
  description: string;
  actionLabel: string;
  view: AppView;
  steps: readonly string[];
};

export function buildStudyRoute(workspace: WorkspaceState, today: string): StudyRoute {
  const { studyPreferences } = workspace;
  const hasMaterials = workspace.materials.length > 0 || workspace.notes.length > 0;
  const reviews = dueFlashcards(workspace, today);

  if (reviews.length > 0) {
    return {
      label: "Revisão de hoje",
      title: "Retome o que já começou",
      description: `Você tem ${reviews.length} ${reviews.length === 1 ? "flashcard" : "flashcards"} para revisar hoje.`,
      actionLabel: "Revisar agora",
      view: "learn",
      steps: ["Revisar", "Praticar", "Registrar o que aprendeu"],
    };
  }

  if (!hasMaterials) {
    return {
      label: "Primeiro passo",
      title: "Dê um ponto de partida ao seu estudo",
      description: "Adicione um material ou uma anotação para montarmos sua próxima rota.",
      actionLabel: "Abrir Biblioteca",
      view: "library",
      steps: ["Adicionar material", "Organizar", "Praticar"],
    };
  }

  if (studyPreferences.processing === "global") {
    return {
      label: "Visão geral",
      title: "Veja a matéria antes dos detalhes",
      description:
        "Comece reunindo as ideias principais e escolha qual tópico explorar em seguida.",
      actionLabel: "Ver materiais",
      view: "library",
      steps: ["Visão geral", "Escolher tópico", "Aprofundar"],
    };
  }

  if (hasStudyModality(studyPreferences, "visual")) {
    return {
      label: "Rota visual",
      title: "Organize as ideias no papel",
      description: "Transforme o conteúdo em uma anotação com títulos, relações e pontos-chave.",
      actionLabel: "Abrir Cadernos",
      view: "notes",
      steps: ["Ler", "Organizar", "Revisar"],
    };
  }

  if (hasStudyModality(studyPreferences, "leitura-escrita")) {
    return {
      label: "Rota de leitura",
      title: "Escreva um resumo curto",
      description: "Registre o essencial com suas palavras antes de partir para a prática.",
      actionLabel: "Abrir Cadernos",
      view: "notes",
      steps: ["Ler", "Resumir", "Revisar"],
    };
  }

  if (hasStudyModality(studyPreferences, "auditivo")) {
    return {
      label: "Rota de escuta",
      title: "Ouça e explique o conteúdo",
      description: "Faça uma prática de escuta e tente explicar a resposta em voz alta.",
      actionLabel: "Começar prática",
      view: "learn",
      steps: ["Ouvir", "Explicar", "Revisar"],
    };
  }

  return {
    label: studyPreferences.rhythm === "difuso" ? "Rota com pausas" : "Rota de prática",
    title:
      studyPreferences.rhythm === "difuso"
        ? "Estude em blocos curtos"
        : "Teste o que você aprendeu",
    description:
      studyPreferences.rhythm === "difuso"
        ? "Faça uma prática curta, dê uma pausa e retome a ideia depois."
        : "Aplique o conteúdo em uma rodada curta de prática.",
    actionLabel: "Começar prática",
    view: "learn",
    steps:
      studyPreferences.rhythm === "difuso"
        ? ["Praticar", "Pausar", "Retomar"]
        : ["Estudar", "Praticar", "Revisar"],
  };
}
