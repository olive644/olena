import type { AppView } from "../components/app-navigation";
import type { NavigationIconName } from "../components/navigation-icon";

export type ProductModuleStatus = "available" | "foundation" | "planned";

export type ProductModule = {
  id: string;
  name: string;
  purpose: string;
  status: ProductModuleStatus;
  entryView?: AppView;
};

export const PRODUCT_MODULES = [
  {
    id: "student-space",
    name: "Espaço do aluno",
    purpose: "Reunir prioridades, progresso e atalhos em um ponto de partida único.",
    status: "available",
    entryView: "today",
  },
  {
    id: "planner",
    name: "Agenda e planner",
    purpose: "Organizar tarefas, compromissos, listas de homework e o planejamento de estudos.",
    status: "available",
    entryView: "planner",
  },
  {
    id: "focus",
    name: "Foco",
    purpose: "Cronometrar sessões e registrar tempo de estudo sem prometer bloqueio nativo.",
    status: "available",
    entryView: "focus",
  },
  {
    id: "habits",
    name: "Hábitos",
    purpose: "Acompanhar consistência diária.",
    status: "available",
    entryView: "habits",
  },
  {
    id: "notes",
    name: "Cadernos",
    purpose: "Criar e editar anotações locais.",
    status: "available",
    entryView: "notes",
  },
  {
    id: "library",
    name: "Biblioteca",
    purpose: "Reunir materiais, links, textos e flashcards.",
    status: "available",
    entryView: "library",
  },
  {
    id: "learn",
    name: "Revisão e quizzes",
    purpose: "Revisar flashcards, praticar escuta, responder quizzes locais e acompanhar metas.",
    status: "available",
    entryView: "learn",
  },
  {
    id: "lesson-plans",
    name: "Planos de aula",
    purpose: "Montar rascunhos determinísticos de aulas de inglês.",
    status: "available",
    entryView: "lesson-builder",
  },
  {
    id: "helena-ai",
    name: "Helena inteligente",
    purpose: "Apoiar o estudo com fontes escolhidas e consentimento explícito.",
    status: "foundation",
  },
  {
    id: "activity-bank",
    name: "Banco de atividades",
    purpose: "Reunir atividades de prática classificadas por controle, tempo e material.",
    status: "available",
    entryView: "activity-bank",
  },
  {
    id: "exams",
    name: "Vestibulares e simulados",
    purpose: "Planejar provas, diagnósticos e simulados por edital.",
    status: "planned",
  },
  {
    id: "question-bank",
    name: "Banco de questões",
    purpose: "Filtrar questões, registrar respostas e formar um caderno de erros.",
    status: "planned",
  },
  {
    id: "scanner",
    name: "Digitalização",
    purpose: "Fotografar, realçar e anexar páginas a uma anotação local.",
    status: "available",
    entryView: "notes",
  },
  {
    id: "ocr",
    name: "Reconhecimento de texto",
    purpose: "Extrair texto de digitalizações com revisão humana antes de salvar.",
    status: "planned",
  },
  {
    id: "documents",
    name: "Documentos",
    purpose: "Editar textos longos, trabalhos e resumos com histórico de versões.",
    status: "planned",
  },
  {
    id: "content-maps",
    name: "Mapas de conteúdo",
    purpose: "Conectar blocos de conhecimento e visualizar relações entre assuntos.",
    status: "planned",
  },
  {
    id: "culture",
    name: "Cultura e repertório",
    purpose: "Construir repertório acadêmico com referências e autoria respeitadas.",
    status: "planned",
  },
  {
    id: "bingo",
    name: "Bingo de estudos",
    purpose: "Transformar revisão e metas em atividades leves e opcionais.",
    status: "available",
    entryView: "learn",
  },
] as const satisfies readonly ProductModule[];

export type StudentSpaceTool = {
  view: AppView;
  title: string;
  description: string;
  icon: NavigationIconName;
};

export const STUDENT_SPACE_TOOLS = [
  { view: "focus", title: "Iniciar foco", description: "Abrir temporizador", icon: "focus" },
  { view: "notes", title: "Novo caderno", description: "Abrir cadernos", icon: "notes" },
  {
    view: "planner",
    title: "Planejar a semana",
    description: "Abrir agenda",
    icon: "planner",
  },
  { view: "learn", title: "Praticar", description: "Minigames e Modo Sala", icon: "learn" },
  {
    view: "library",
    title: "Consultar materiais",
    description: "Abrir biblioteca",
    icon: "library",
  },
] as const satisfies readonly StudentSpaceTool[];
