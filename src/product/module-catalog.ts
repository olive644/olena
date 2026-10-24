import { localizeResource, uiText } from "../i18n/runtime.js";
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

export const PRODUCT_MODULES = localizeResource([
  {
    id: "student-space",
    name: "Espaço do aluno",
    get purpose() {
      return uiText(2252);
    },
    status: "available",
    entryView: "today",
  },
  {
    id: "planner",
    name: "Agenda e planner",
    get purpose() {
      return uiText(2304);
    },
    status: "available",
    entryView: "planner",
  },
  {
    id: "focus",
    name: "Foco",
    get purpose() {
      return uiText(2253);
    },
    status: "available",
    entryView: "focus",
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
    get purpose() {
      return uiText(2305);
    },
    status: "available",
    entryView: "library",
  },
  {
    id: "learn",
    name: "Revisão e quizzes",
    get purpose() {
      return uiText(2306);
    },
    status: "available",
    entryView: "learn",
  },
  {
    id: "lesson-plans",
    name: "Planos de aula",
    get purpose() {
      return uiText(2256);
    },
    status: "available",
    entryView: "lesson-builder",
  },
  {
    id: "helena-ai",
    name: "Olena inteligente",
    get purpose() {
      return uiText(2257);
    },
    status: "foundation",
  },
  {
    id: "activity-bank",
    name: "Banco de atividades",
    get purpose() {
      return uiText(2258);
    },
    status: "available",
    entryView: "activity-bank",
  },
  {
    id: "exams",
    name: "Vestibulares e simulados",
    get purpose() {
      return uiText(2259);
    },
    status: "planned",
  },
  {
    id: "question-bank",
    name: "Banco de questões",
    get purpose() {
      return uiText(2261);
    },
    status: "planned",
  },
  {
    id: "scanner",
    name: "Digitalização",
    get purpose() {
      return uiText(2262);
    },
    status: "available",
    entryView: "notes",
  },
  {
    id: "handwriting",
    name: "Escrita à mão",
    get purpose() {
      return uiText(2263);
    },
    status: "available",
    entryView: "notes",
  },
  {
    id: "ocr",
    name: "Reconhecimento de texto em digitalizações",
    get purpose() {
      return uiText(2265);
    },
    status: "planned",
  },
  {
    id: "documents",
    name: "Documentos",
    get purpose() {
      return uiText(2266);
    },
    status: "planned",
  },
  {
    id: "content-maps",
    name: "Mapas de conteúdo",
    get purpose() {
      return uiText(2268);
    },
    status: "planned",
  },
  {
    id: "culture",
    name: "Cultura e repertório",
    get purpose() {
      return uiText(2270);
    },
    status: "planned",
  },
  {
    id: "bingo",
    name: "Bingo de estudos",
    get purpose() {
      return uiText(2271);
    },
    status: "available",
    entryView: "learn",
  },
  {
    id: "room",
    name: "Modo Sala",
    get purpose() {
      return uiText(2272);
    },
    status: "available",
    entryView: "room",
  },
] as const satisfies readonly ProductModule[]);

export type StudentSpaceTool = {
  view: AppView;
  title: string;
  description: string;
  icon: NavigationIconName;
};

export const STUDENT_SPACE_TOOLS = localizeResource([
  {
    view: "focus",
    title: uiText("Iniciar foco"),
    description: uiText("Abrir temporizador"),
    icon: "focus",
  },
  {
    view: "notes",
    title: uiText("Novo caderno"),
    description: uiText("Abrir cadernos"),
    icon: "notes",
  },
  {
    view: "planner",
    title: uiText("Planejar a semana"),
    description: uiText("Abrir agenda"),
    icon: "planner",
  },
  {
    view: "learn",
    title: uiText("Praticar"),
    description: uiText("Minigames e Modo Sala"),
    icon: "learn",
  },
  {
    view: "library",
    title: uiText("Consultar materiais"),
    description: uiText("Abrir biblioteca"),
    icon: "library",
  },
] as const satisfies readonly StudentSpaceTool[]);
