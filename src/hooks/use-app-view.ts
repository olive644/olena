import { useCallback, useEffect, useState } from "react";
import type { AppView } from "../components/app-navigation";
import { pathForView, viewFromPath } from "../domain/app-routes";

function resolve(fallback: AppView): AppView {
  // A raiz é a aba inicial, ou a que um convite de sala pediu.
  if (window.location.pathname === "/") return fallback;
  return viewFromPath(window.location.pathname) ?? fallback;
}

// A aba ativa vive no endereço da página. `fallback` vale quando o endereço não é de uma aba
// (por exemplo a raiz com um convite de sala).
export function useAppView(fallback: AppView): [AppView, (view: AppView) => void] {
  const [view, setView] = useState<AppView>(() => resolve(fallback));

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
