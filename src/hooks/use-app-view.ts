import { useCallback, useEffect, useState } from "react";
import type { AppView } from "../components/app-navigation";
import { pathForView, viewFromPath } from "../domain/app-routes";

function resolve(fallback: AppView): AppView | null {
  // A raiz é a aba inicial, ou a que um convite de sala pediu.
  if (window.location.pathname === "/") return fallback;
  if (fallback === "room" && /^\/sala\/[^/]+\/projetor\/?$/i.test(window.location.pathname))
    return "room";
  return viewFromPath(window.location.pathname);
}

// A aba ativa vive no endereço. A raiz pode receber um convite de sala;
// caminhos desconhecidos devolvem null para a página 404.
export function useAppView(fallback: AppView): [AppView | null, (view: AppView) => void] {
  const [view, setView] = useState<AppView | null>(() => resolve(fallback));

  useEffect(() => {
    const onPop = () => setView(resolve(fallback));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [fallback]);

  const navigate = useCallback((next: AppView) => {
    const path = pathForView(next);
    if (window.location.pathname !== path || window.location.search !== "") {
      try {
        // A busca (?sala=, ?onboarding) pertence ao momento em que foi aberta; ao trocar de
        // aba ela deixa de valer.
        window.history.pushState(null, "", path);
      } catch {
        /* Sem History API a aba ainda troca, só não muda o endereço. */
      }
    }
    setView(next);
  }, []);

  return [view, navigate];
}
