import type { AppView } from "../components/app-navigation";

// Cada aba do aplicativo tem o seu próprio endereço, para que recarregar a página, usar o
// botão voltar ou abrir um link leve a pessoa à mesma tela.
export const VIEW_PATHS: Record<AppView, string> = {
  today: "/",
  planner: "/planejador",
  focus: "/foco",
  habits: "/habitos",
  notes: "/cadernos",
  "lesson-builder": "/aulas",
  learn: "/aprender",
  library: "/biblioteca",
  "activity-bank": "/atividades",
  profile: "/perfil",
};

function normalize(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed.toLowerCase();
}

// Devolve a aba de um caminho, ou null se o caminho não for de nenhuma aba.
export function viewFromPath(pathname: string): AppView | null {
  const path = normalize(pathname);
  for (const [view, viewPath] of Object.entries(VIEW_PATHS) as [AppView, string][]) {
    if (viewPath === path) return view;
  }
  return null;
}

export function pathForView(view: AppView): string {
  return VIEW_PATHS[view];
}
