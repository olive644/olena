import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type NotebookPageJourneyState = {
  from: { x: number; y: number; width: number; height: number };
  paper: HTMLElement;
  background: { element: HTMLElement; x: number; y: number; width: number; height: number };
};

export function NotebookPageJourney({
  journey,
  onDone,
}: {
  journey: NotebookPageJourneyState;
  onDone: () => void;
}) {
  const carrier = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!carrier.current) return;
    const element = carrier.current;
    const paper = journey.paper.cloneNode(true) as HTMLElement;
    paper.setAttribute("inert", "");
    paper.removeAttribute("id");
    paper.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    element.replaceChildren(paper);
    const scene = backdrop.current;
    if (scene) {
      const background = journey.background;
      const copy = background.element.cloneNode(true) as HTMLElement;
      copy.setAttribute("inert", "");
      copy.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      Object.assign(copy.style, {
        position: "absolute",
        left: `${background.x}px`,
        top: `${background.y}px`,
        width: `${background.width}px`,
        height: `${background.height}px`,
        margin: "0",
      });
      scene.replaceChildren(copy);
    }
    document.documentElement.classList.add("notebook-page-entering");
    let cancelled = false;
    let started = false;
    let frame = 0;
    const animations: Animation[] = [];
    const reveal = () => document.documentElement.classList.remove("notebook-page-entering");
    const observer = new MutationObserver(start);
    const timeout = window.setTimeout(() => {
      if (!started) {
        reveal();
        onDone();
      }
    }, 4000);
    function start() {
      const target = document.querySelector<HTMLElement>(".handwriting-canvas");
      if (!target || started) return;
      started = true;
      observer.disconnect();
      window.clearTimeout(timeout);
      frame = requestAnimationFrame(() => {
        const bounds = target.getBoundingClientRect();
        const viewport = target.closest(".handwriting-viewport")!.getBoundingClientRect();
        const x = Math.max(0, viewport.x, bounds.x);
        const y = Math.max(0, viewport.y, bounds.y);
        const rect = {
          x,
          y,
          width: Math.min(window.innerWidth, viewport.right, bounds.right) - x,
          height: Math.min(window.innerHeight, viewport.bottom, bounds.bottom) - y,
        };
        const { from } = journey;
        const destination = `translate(${rect.x - from.x}px, ${rect.y - from.y}px)`;
        animations.push(
          element.animate(
            [
              {
                transform: "none",
                width: `${from.width}px`,
                height: `${from.height}px`,
                boxShadow: "0 3px 0 #d5ccba",
                easing: "cubic-bezier(.2,.7,.2,1)",
              },
              {
                transform: "translateY(-16px) rotate(-2deg)",
                width: `${from.width}px`,
                height: `${from.height}px`,
                boxShadow: "0 20px 45px #29243230",
                offset: 0.18,
              },
              {
                transform: destination,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                boxShadow: "0 3px 0 #d5ccba",
                offset: 1,
              },
            ],
            { duration: 650, fill: "both", easing: "cubic-bezier(.22,.65,.25,1)" },
          ),
        );
        if (scene)
          animations.push(
            scene.animate([{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], {
              duration: 650,
              fill: "both",
              easing: "ease-in",
            }),
          );
        void animations[0]!.finished
          .then(async () => {
            if (cancelled) return;
            reveal();
            const fade = element.animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: 150,
              fill: "both",
            });
            animations.push(fade);
            await fade.finished;
            if (!cancelled) onDone();
          })
          .catch(() => {});
      });
    }
    observer.observe(document.body, { childList: true, subtree: true });
    start();
    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearTimeout(timeout);
      cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
      reveal();
    };
  }, [journey, onDone]);
  return createPortal(
    <>
      <div
        ref={backdrop}
        className="notebook-page-journey-backdrop notebooks-main"
        aria-hidden="true"
      />
      <div
        ref={carrier}
        className="notebook-page-journey"
        aria-hidden="true"
        style={{
          left: journey.from.x,
          top: journey.from.y,
          width: journey.from.width,
          height: journey.from.height,
        }}
      />
    </>,
    document.body,
  );
}
