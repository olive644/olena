import { notebook3dCoverRect } from "./notebook-3d/notebook-3d-support";
import { useLayoutEffect, useRef } from "react";
import { isMotionReduced } from "../data/accessibility-preferences";
import { createPortal } from "react-dom";
import type { NotebookTab, StudyNotebook } from "../domain/workspace";
import { NotebookCover } from "./notebook-cover";
import { NotebookBackCover } from "./notebook-back-cover";
import { NOTEBOOK_TURN_MS, NOTEBOOK_TURN_EASING } from "./notebook-motion";

export type NotebookJourneyState = {
  notebook: StudyNotebook;
  tabs: NotebookTab[];
  from: { x: number; y: number; width: number; height: number };
  returning: boolean;
  closed?: boolean;
  destination?: "shelf" | "cover" | "spread";
  /** "back" é a contracapa: o espelho da capa, presa à lombada pelo lado direito. */
  side?: "front" | "back";
  pages?: HTMLElement | undefined;
};

export function notebookShelfCover(id: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-notebook-drop]"))
    .find((element) => element.dataset["notebookDrop"] === id)
    ?.querySelector<HTMLElement>(".book-cover");
}

export function canAnimateNotebook() {
  return typeof Element.prototype.animate === "function" && !isMotionReduced();
}

export function notebookPageSnapshot() {
  const source = document.querySelector<HTMLElement>(".notebook-spread-shell");
  if (!source) return;
  const snapshot = source.cloneNode(true) as HTMLElement;
  const rect = source.getBoundingClientRect();
  snapshot.style.width = `${rect.width}px`;
  snapshot.style.height = `${rect.height}px`;
  snapshot.style.font = getComputedStyle(source).font;
  for (const selector of [".notebook-paper-spread", ".notebook-spread-pair"]) {
    const original = source.querySelector<HTMLElement>(selector);
    const copy = snapshot.querySelector<HTMLElement>(selector);
    if (original && copy) {
      copy.style.height = `${original.getBoundingClientRect().height}px`;
      copy.style.boxSizing = "border-box";
    }
  }
  return snapshot;
}

export function NotebookJourney({
  journey,
  onDone,
}: {
  journey: NotebookJourneyState;
  onDone: () => void;
}) {
  const carrier = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const lining = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = carrier.current;
    // No caderno 3D a capa só viaja fechada; quem abre é a própria cena.
    const scene3d = journey.returning
      ? null
      : document.querySelector<HTMLElement>("[data-notebook-3d] .notebook-3d");
    const closed = Boolean(journey.closed || scene3d);
    const back = journey.side === "back";
    if (element && scene3d) element.dataset["closed"] = "true";
    const target = scene3d
      ? scene3d
      : journey.returning
        ? journey.destination === "cover"
          ? document.querySelector<HTMLElement>(".notebook-concept-cover .book-cover")
          : notebookShelfCover(journey.notebook.id)
        : document.querySelector<HTMLElement>(".notebook-spread-shell");
    if (!element || !target || !canAnimateNotebook()) {
      onDone();
      return;
    }
    const snapshot = journey.pages
      ? (journey.pages.cloneNode(true) as HTMLElement)
      : notebookPageSnapshot();
    if (snapshot && paper.current) {
      snapshot.style.transformOrigin = "top left";
      const fit = `scale(${(journey.from.width * 2) / parseFloat(snapshot.style.width)}, ${journey.from.height / parseFloat(snapshot.style.height)})`;
      snapshot.style.transform = fit;
      snapshot.setAttribute("inert", "");
      snapshot.setAttribute("aria-hidden", "true");
      snapshot.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      paper.current.replaceChildren(snapshot);
      // O verso leva a primeira folha na mesma escala do miolo. Ao completar
      // a volta, ela coincide com a folha fixa, como no folheamento das demais.
      if (lining.current) {
        const linedPage = snapshot.cloneNode(true) as HTMLElement;
        // O verso da contracapa leva a folha da direita: o miolo anda meia largura.
        if (back) linedPage.style.transform = `translateX(-${journey.from.width}px) ${fit}`;
        lining.current.replaceChildren(linedPage);
      }
    }
    const animations: Animation[] = [];
    let cancelled = false;
    const previousVisibility = target.style.visibility;
    target.style.visibility = "hidden";
    const frame = requestAnimationFrame(() => {
      if (journey.returning && journey.destination !== "cover")
        target.scrollIntoView({ block: "nearest", behavior: "instant" });
      const rect = target.getBoundingClientRect();
      const destination = scene3d
        ? notebook3dCoverRect(scene3d)
        : journey.returning
          ? rect
          : {
              x: back ? rect.x : rect.x + rect.width / 2,
              y: rect.y,
              width: rect.width / 2,
              height: rect.height,
            };
      const { from } = journey;
      const transport = `translate(${destination.x - from.x}px, ${destination.y - from.y}px) scale(${destination.width / from.width}, ${destination.height / from.height})`;
      const duration = NOTEBOOK_TURN_MS + 480;
      const openingStart = 420 / duration;
      const openingEnd = (420 + NOTEBOOK_TURN_MS) / duration;
      const closingEnd = NOTEBOOK_TURN_MS / duration;
      const timing: KeyframeAnimationOptions = { duration, fill: "both" };
      const animate = (node: Element | null, frames: Keyframe[]) => {
        if (node) {
          if (closed && node !== element) {
            if (node === paper.current) (node as HTMLElement).style.display = "none";
            else (node as HTMLElement).style.transform = "none";
            return;
          }
          animations.push(node.animate(frames, timing));
        }
      };
      animate(
        element,
        journey.returning
          ? [
              { transform: "none" },
              {
                transform: "none",
                offset: closed ? 0 : 0.65,
                easing: "cubic-bezier(.45,0,.2,1)",
              },
              { transform: transport },
            ]
          : [
              { transform: "none", easing: "cubic-bezier(.2,.7,.2,1)" },
              { transform: transport, offset: 0.38 },
              { transform: transport },
            ],
      );
      // O ângulo é uma propriedade registrada: brilho, sombra e elevação saem dele no CSS.
      const open = back ? "180deg" : "-180deg";
      if (!closed)
        animations.push(
          element.animate(
            journey.returning
              ? [
                  { "--cover-angle": open, easing: NOTEBOOK_TURN_EASING },
                  { "--cover-angle": "0deg", offset: closingEnd },
                  { "--cover-angle": "0deg" },
                ]
              : [
                  { "--cover-angle": "0deg" },
                  {
                    "--cover-angle": "0deg",
                    offset: openingStart,
                    easing: NOTEBOOK_TURN_EASING,
                  },
                  { "--cover-angle": open, offset: openingEnd },
                  { "--cover-angle": open },
                ],
            timing,
          ),
        );
      animate(
        element.querySelector(".notebook-journey-clasp"),
        journey.returning
          ? [
              { transform: "rotateY(-180deg)" },
              { transform: "rotateY(-180deg)", offset: 0.48 },
              { transform: "rotateY(0deg)", offset: 0.66 },
              { transform: "rotateY(0deg)" },
            ]
          : [
              { transform: "rotateY(0deg)" },
              { transform: "rotateY(0deg)", offset: 0.4 },
              { transform: "rotateY(-180deg)", offset: 0.57 },
              { transform: "rotateY(-180deg)" },
            ],
      );
      const held = back ? "inset(-80px 50% -80px -100px)" : "inset(-80px -100px -80px 50%)";
      const freed = back ? "inset(-80px -30px -80px -100px)" : "inset(-80px -100px -80px -30px)";
      const hidden = back ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)";
      animate(
        paper.current,
        journey.returning
          ? [
              { clipPath: held, easing: "steps(1, end)" },
              { clipPath: held, offset: closingEnd, easing: "steps(1, start)" },
              { clipPath: hidden, offset: closingEnd + 0.001 },
              { clipPath: hidden },
            ]
          : [
              { clipPath: held },
              { clipPath: held, offset: openingEnd, easing: "steps(1, start)" },
              { clipPath: freed, offset: openingEnd + 0.001 },
              { clipPath: freed },
            ],
      );
      void animations[0]!.finished
        .then(() => {
          if (cancelled) return;
          target.style.visibility = previousVisibility;
          const focusTarget = journey.returning
            ? target.closest<HTMLElement>("button")
            : document.querySelector<HTMLElement>(".notebook-back-tool");
          const restoreFocus = document.activeElement === document.body;
          onDone();
          if (restoreFocus) focusTarget?.focus({ preventScroll: true });
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
      target.style.visibility = previousVisibility;
    };
  }, [journey, onDone]);

  return createPortal(
    <div
      className="notebook-journey"
      data-returning={journey.returning}
      data-closed={journey.closed ?? false}
      data-side={journey.side ?? "front"}
      ref={carrier}
      aria-hidden="true"
      style={{
        left: journey.from.x,
        top: journey.from.y,
        width: journey.from.width,
        height: journey.from.height,
      }}
    >
      <div className="notebook-journey-pages" ref={paper} />
      <i className="notebook-journey-cast" />
      <div className="notebook-journey-leaf">
        {journey.side === "back" ? (
          <NotebookBackCover subjectColor="#7C3AED" />
        ) : (
          <NotebookCover
            subjectColor="#7C3AED"
            title={journey.notebook.title}
            tabs={journey.tabs}
            clasp={false}
          />
        )}
        <i className="notebook-journey-shade is-front" />
        <div className="notebook-journey-lining" ref={lining} />
        <i className="notebook-journey-shade is-lining" />
      </div>
      <span className="book-cover__clasp notebook-journey-clasp">
        <i />
      </span>
    </div>,
    document.body,
  );
}
