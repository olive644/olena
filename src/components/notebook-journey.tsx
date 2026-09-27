import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { NotebookTab, StudyNotebook } from "../domain/workspace";
import { NotebookCover } from "./notebook-cover";
import { NOTEBOOK_TURN_MS, NOTEBOOK_TURN_EASING } from "./notebook-motion";

export type NotebookJourneyState = {
  notebook: StudyNotebook;
  tabs: NotebookTab[];
  from: { x: number; y: number; width: number; height: number };
  returning: boolean;
  closed?: boolean;
  destination?: "shelf" | "cover" | "spread";
  pages?: HTMLElement | undefined;
};

export function notebookShelfCover(id: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-notebook-drop]"))
    .find((element) => element.dataset["notebookDrop"] === id)
    ?.querySelector<HTMLElement>(".book-cover");
}

export function canAnimateNotebook() {
  return (
    typeof Element.prototype.animate === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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
    const target = journey.returning
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
      snapshot.style.transform = `scale(${(journey.from.width * 2) / parseFloat(snapshot.style.width)}, ${journey.from.height / parseFloat(snapshot.style.height)})`;
      snapshot.setAttribute("inert", "");
      snapshot.setAttribute("aria-hidden", "true");
      snapshot.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      paper.current.replaceChildren(snapshot);
      // O verso leva a primeira folha na mesma escala do miolo. Ao completar
      // a volta, ela coincide com a folha fixa, como no folheamento das demais.
      if (lining.current) lining.current.replaceChildren(snapshot.cloneNode(true));
    }
    const animations: Animation[] = [];
    let cancelled = false;
    const previousVisibility = target.style.visibility;
    target.style.visibility = "hidden";
    const frame = requestAnimationFrame(() => {
      if (journey.returning && journey.destination !== "cover")
        target.scrollIntoView({ block: "nearest", behavior: "instant" });
      const rect = target.getBoundingClientRect();
      const destination = journey.returning
        ? rect
        : {
            x: rect.x + rect.width / 2,
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
          if (journey.closed && node !== element) {
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
                offset: journey.closed ? 0 : 0.65,
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
      animate(
        element.querySelector(".notebook-journey-leaf"),
        journey.returning
          ? [
              { transform: "rotateY(-180deg)", easing: NOTEBOOK_TURN_EASING },
              { transform: "rotateY(0deg)", offset: closingEnd },
              { transform: "rotateY(0deg)" },
            ]
          : [
              { transform: "rotateY(0deg)" },
              { transform: "rotateY(0deg)", offset: openingStart, easing: NOTEBOOK_TURN_EASING },
              { transform: "rotateY(-180deg)", offset: openingEnd },
              { transform: "rotateY(-180deg)" },
            ],
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
      animate(
        paper.current,
        journey.returning
          ? [
              { clipPath: "inset(-80px -100px -80px 50%)", easing: "steps(1, end)" },
              {
                clipPath: "inset(-80px -100px -80px 50%)",
                offset: closingEnd,
                easing: "steps(1, start)",
              },
              { clipPath: "inset(0 0 0 100%)", offset: closingEnd + 0.001 },
              { clipPath: "inset(0 0 0 100%)" },
            ]
          : [
              { clipPath: "inset(-80px -100px -80px 50%)" },
              {
                clipPath: "inset(-80px -100px -80px 50%)",
                offset: openingEnd,
                easing: "steps(1, start)",
              },
              { clipPath: "inset(-80px -100px -80px -30px)", offset: openingEnd + 0.001 },
              { clipPath: "inset(-80px -100px -80px -30px)" },
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
      data-cover-style={journey.notebook.coverStyle}
      data-returning={journey.returning}
      data-closed={journey.closed ?? false}
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
      <div className="notebook-journey-leaf">
        <NotebookCover
          subjectColor="#7C3AED"
          title={journey.notebook.title}
          coverStyle={journey.notebook.coverStyle}
          tabs={journey.tabs}
          clasp={false}
        />
        <div className="notebook-journey-lining" ref={lining} />
      </div>
      <span className="book-cover__clasp notebook-journey-clasp">
        <i />
      </span>
    </div>,
    document.body,
  );
}
