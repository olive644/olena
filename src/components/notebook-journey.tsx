import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { NotebookTab, StudyNotebook } from "../domain/workspace";
import { NotebookCover } from "./notebook-cover";

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
  return document.querySelector<HTMLElement>(".notebook-spread-shell")?.cloneNode(true) as
    HTMLElement | undefined;
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
    const snapshot = journey.pages ?? notebookPageSnapshot();
    if (snapshot && paper.current) {
      snapshot.setAttribute("inert", "");
      snapshot.setAttribute("aria-hidden", "true");
      snapshot.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      paper.current.replaceChildren(snapshot);
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
      const timing: KeyframeAnimationOptions = { duration: 1100, fill: "both" };
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
              { transform: "none", offset: 0.53, easing: "cubic-bezier(.45,0,.2,1)" },
              { transform: transport },
            ]
          : [
              { transform: "none", easing: "cubic-bezier(.2,.7,.2,1)" },
              { transform: transport, offset: 0.48 },
              { transform: transport },
            ],
      );
      animate(
        element.querySelector(".notebook-journey-leaf"),
        journey.returning
          ? [
              { transform: "rotateY(-180deg)" },
              { transform: "rotateY(0deg)", offset: 0.46 },
              { transform: "rotateY(0deg)" },
            ]
          : [
              { transform: "rotateY(0deg)" },
              { transform: "rotateY(0deg)", offset: 0.38, easing: "cubic-bezier(.4,0,.2,1)" },
              { transform: "rotateY(-180deg)", offset: 0.93 },
              { transform: "rotateY(-180deg)" },
            ],
      );
      animate(
        element.querySelector(".notebook-journey-clasp"),
        journey.returning
          ? [
              { transform: "rotateY(-180deg)" },
              { transform: "rotateY(-180deg)", offset: 0.42 },
              { transform: "rotateY(0deg)", offset: 0.58 },
              { transform: "rotateY(0deg)" },
            ]
          : [
              { transform: "rotateY(0deg)" },
              { transform: "rotateY(0deg)", offset: 0.18 },
              { transform: "rotateY(-180deg)", offset: 0.37 },
              { transform: "rotateY(-180deg)" },
            ],
      );
      animate(
        paper.current,
        journey.returning
          ? [
              { clipPath: "inset(-80px -100px -80px -30px)" },
              { clipPath: "inset(-80px -100px -80px 50%)", offset: 0.45 },
              { clipPath: "inset(-80px -100px -80px 50%)" },
            ]
          : [
              { clipPath: "inset(-80px -100px -80px 50%)" },
              { clipPath: "inset(-80px -100px -80px 50%)", offset: 0.4 },
              { clipPath: "inset(-80px -100px -80px -30px)", offset: 0.94 },
              { clipPath: "inset(-80px -100px -80px -30px)" },
            ],
      );
      if (!journey.returning)
        animate(element.querySelector(".notebook-journey-leaf"), [
          { opacity: 1 },
          { opacity: 1, offset: 0.9 },
          { opacity: 0 },
        ]);
      else if (!journey.closed)
        animate(element.querySelector(".notebook-journey-leaf"), [
          { opacity: 0 },
          { opacity: 1, offset: 0.12 },
          { opacity: 1 },
        ]);
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
          tabs={journey.tabs}
          clasp={false}
        />
        <span className="notebook-journey-lining" />
      </div>
      <span className="book-cover__clasp notebook-journey-clasp">
        <i />
      </span>
    </div>,
    document.body,
  );
}
