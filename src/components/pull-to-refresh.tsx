import { useEffect, useRef, useState } from "react";
import { HelenaLoading } from "./helena-loading";
import { uiText, useLanguage } from "../i18n/runtime";
import "./pull-to-refresh.css";

const reloadPage = () => window.location.reload();

export function PullToRefresh({ refresh = reloadPage }: { refresh?: () => void }) {
  useLanguage();
  const [distance, setDistance] = useState(0);
  const [busy, setBusy] = useState(false);
  const refreshing = useRef(false);
  useEffect(() => {
    let start: { x: number; y: number } | null = null;
    let pulled = 0;
    let frame = 0;
    const reset = () => {
      start = null;
      pulled = 0;
      setDistance(0);
    };
    const begin = (event: TouchEvent) => {
      if (refreshing.current) return;
      reset();
      if (event.touches.length !== 1 || window.scrollY > 0) return;
      const target = event.target;
      if (
        !(target instanceof Element) ||
        target.closest(
          "button,a,input,textarea,select,[contenteditable],[role=dialog],[role=slider],canvas",
        ) ||
        document.querySelector('[role="dialog"],dialog[open]')
      )
        return;
      for (let node = target; node !== document.body; node = node.parentElement!) {
        if (
          !node ||
          node.scrollTop > 0 ||
          (node.scrollHeight > node.clientHeight &&
            /auto|scroll/.test(getComputedStyle(node).overflowY))
        )
          return;
      }
      start = { x: event.touches[0]!.clientX, y: event.touches[0]!.clientY };
    };
    const move = (event: TouchEvent) => {
      if (!start) return;
      if (event.touches.length !== 1 || window.scrollY > 0) return reset();
      const dx = event.touches[0]!.clientX - start.x;
      const dy = event.touches[0]!.clientY - start.y;
      if (dy < 0 || Math.abs(dx) > Math.abs(dy)) return reset();
      if (dy < 8) return;
      if (!event.cancelable) return reset();
      event.preventDefault();
      pulled = Math.min(112, dy * 0.45);
      setDistance(pulled);
    };
    const end = () => {
      start = null;
      if (pulled < 80 || refreshing.current) return reset();
      refreshing.current = true;
      setBusy(true);
      setDistance(96);
      // Dá um quadro à arte antes da navegação, sem atrasar a atualização.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(refresh);
      });
    };
    document.documentElement.classList.add("paper-refresh-enabled");
    document.addEventListener("touchstart", begin, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", reset);
    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.classList.remove("paper-refresh-enabled");
      document.removeEventListener("touchstart", begin);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", reset);
    };
  }, [refresh]);
  if (!distance) return null;
  return (
    <div
      className="paper-refresh"
      data-ready={distance >= 80}
      data-busy={busy}
      style={{ transform: `translate(-50%, ${distance - 112}px)` }}
    >
      <HelenaLoading
        compact
        variant="refresh"
        label={
          busy
            ? uiText("Atualizando…")
            : distance >= 80
              ? uiText("Solte para atualizar")
              : uiText("Puxe para atualizar")
        }
      />
    </div>
  );
}
