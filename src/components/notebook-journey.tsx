import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { NotebookTab, StudyNotebook } from "../domain/workspace";
import { NotebookCover } from "./notebook-cover";

export type NotebookJourneyState = {
  notebook: StudyNotebook;
  tabs: NotebookTab[];
  from: { x: number; y: number; width: number; height: number };
  returning: boolean;
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

export function NotebookJourney({
  journey,
  onDone,
}: {
  journey: NotebookJourneyState;
  onDone: () => void;
}) {
  const carrier = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const animations: Animation[] = [];
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      const element = carrier.current;
      const target = journey.returning
        ? notebookShelfCover(journey.notebook.id)
        : document.querySelector<HTMLElement>(".notebook-paper-spread");
      if (!element || !target || !canAnimateNotebook()) {
        onDone();
        return;
      }
      if (journey.returning) target.scrollIntoView({ block: "nearest", behavior: "instant" });
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
      const transform = `translate(${destination.x - from.x}px, ${destination.y - from.y}px) scale(${destination.width / from.width}, ${destination.height / from.height})`;
      const timing: KeyframeAnimationOptions = {
        duration: 940,
        easing: "linear",
        fill: "both",
      };
      animations.push(
        element.animate(
          journey.returning
            ? [
                { transform: "none", offset: 0 },
                { transform: "none", offset: 0.28, easing: "cubic-bezier(.22,.7,.18,1)" },
                { transform, offset: 1 },
              ]
            : [
                { transform: "none", offset: 0, easing: "cubic-bezier(.22,.7,.18,1)" },
                { transform, offset: 0.65 },
                { transform, offset: 1 },
              ],
          timing,
        ),
      );
      const cover = element.querySelector<HTMLElement>(".book-cover__face");
      if (cover)
        animations.push(
          cover.animate(
            journey.returning
              ? [
                  { transform: "rotateY(-165deg)" },
                  { transform: "rotateY(0deg)", offset: 0.4 },
                  { transform: "rotateY(0deg)" },
                ]
              : [
                  { transform: "rotateY(0deg)" },
                  { transform: "rotateY(-12deg)", offset: 0.4 },
                  { transform: "rotateY(-165deg)" },
                ],
            timing,
          ),
        );
      const lining = element.querySelector<HTMLElement>(".notebook-journey-lining");
      if (lining)
        animations.push(
          lining.animate(
            journey.returning
              ? [
                  { transform: "rotateY(-165deg)" },
                  { transform: "rotateY(0deg)", offset: 0.4 },
                  { transform: "rotateY(0deg)" },
                ]
              : [
                  { transform: "rotateY(0deg)" },
                  { transform: "rotateY(-12deg)", offset: 0.4 },
                  { transform: "rotateY(-165deg)" },
                ],
            timing,
          ),
        );
      if (lining)
        animations.push(
          lining.animate(
            journey.returning
              ? [
                  { opacity: 1 },
                  { opacity: 1, offset: 0.18 },
                  { opacity: 0, offset: 0.19 },
                  { opacity: 0 },
                ]
              : [
                  { opacity: 0 },
                  { opacity: 0, offset: 0.7 },
                  { opacity: 1, offset: 0.71 },
                  { opacity: 1 },
                ],
            timing,
          ),
        );
      const clasp = element.querySelector<HTMLElement>(".book-cover__clasp");
      if (clasp)
        animations.push(
          clasp.animate(
            {
              transform: journey.returning
                ? ["rotateY(170deg)", "rotateY(0deg)"]
                : ["rotateY(0deg)", "rotateY(170deg)"],
            },
            { ...timing, duration: 300 },
          ),
        );
      animations.push(
        target.animate(
          journey.returning
            ? [{ opacity: 0 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }]
            : [
                { opacity: 0, transform: "scaleX(.5)", transformOrigin: "75% center" },
                { opacity: 0, transform: "scaleX(.5)", offset: 0.35 },
                { opacity: 1, transform: "scaleX(1)" },
              ],
          timing,
        ),
      );
      if (!journey.returning)
        animations.push(
          element.animate([{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], timing),
        );
      void animations[0]!.finished
        .then(() => {
          if (cancelled) return;
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
    };
  }, [journey, onDone]);

  return createPortal(
    <div
      className="notebook-journey"
      ref={carrier}
      aria-hidden="true"
      style={{
        left: journey.from.x,
        top: journey.from.y,
        width: journey.from.width,
        height: journey.from.height,
      }}
    >
      <NotebookCover subjectColor="#7C3AED" title={journey.notebook.title} tabs={journey.tabs} />
      <span className="notebook-journey-lining" />
    </div>,
    document.body,
  );
}
