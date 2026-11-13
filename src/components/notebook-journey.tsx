import { NotebookClasp } from "./notebook-clasp";
import { useLayoutEffect, useRef } from "react";
import { isMotionReduced } from "../data/accessibility-preferences";
import { createPortal } from "react-dom";
import type { NotebookTab, StudyNotebook } from "../domain/workspace";
import { notebookCoverTheme } from "../domain/notebook-covers";
import { NotebookCover } from "./notebook-cover";
import { NotebookBackCover } from "./notebook-back-cover";
import { NOTEBOOK_TURN_MS, NOTEBOOK_TURN_EASING } from "./notebook-motion";

export type NotebookJourneyState = {
  notebook: StudyNotebook;
  tabs: NotebookTab[];
  from: { x: number; y: number; width: number; height: number };
  returning: boolean;
  shelfAngle?: number;
  closed?: boolean;
  destination?: "shelf" | "cover" | "spread";
  /** "back" é a contracapa: o espelho da capa, presa à lombada pelo lado direito. */
  side?: "front" | "back";
  pages?: HTMLElement | undefined;
};

export function notebookShelfCover(id: string) {
  const book = Array.from(document.querySelectorAll<HTMLElement>("[data-notebook-drop]")).find(
    (element) => element.dataset["notebookDrop"] === id,
  );
  if (book?.matches(".notebook-spine")) return book;
  return book?.querySelector<HTMLElement>(".book-cover");
}

export function notebookShelfPose(element: HTMLElement, resting = false) {
  const inspection = element.querySelector<HTMLElement>(".notebook-spine__inspection");
  const rect = element.getBoundingClientRect();
  if (!inspection) return { rect, angle: 0 };
  const matrix = new DOMMatrixReadOnly(getComputedStyle(inspection).transform);
  const width = inspection.offsetWidth;
  const height = inspection.offsetHeight;
  return {
    rect: {
      x: rect.x + (rect.width - width) / 2,
      y: rect.bottom - height + (resting ? 0 : matrix.m42),
      width,
      height,
    },
    angle: resting ? 90 : Math.atan2(matrix.m31, matrix.m11) * (180 / Math.PI),
  };
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
  const marks = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = carrier.current;
    const closed = Boolean(journey.closed);
    const back = journey.side === "back";
    const target = journey.returning
      ? journey.destination === "cover"
        ? document.querySelector<HTMLElement>(".notebook-concept-cover .book-cover")
        : notebookShelfCover(journey.notebook.id)
      : document.querySelector<HTMLElement>(
          journey.destination === "cover"
            ? ".notebook-concept-cover .book-cover"
            : ".notebook-spread-shell",
        );
    if (!element || !target || !canAnimateNotebook()) {
      onDone();
      return;
    }
    const snapshot = closed
      ? undefined
      : ((journey.pages?.cloneNode(true) as HTMLElement | undefined) ?? notebookPageSnapshot());
    if (snapshot && paper.current) {
      snapshot.style.transformOrigin = "top left";
      const fit = `scale(${(journey.from.width * 2) / parseFloat(snapshot.style.width)}, ${journey.from.height / parseFloat(snapshot.style.height)})`;
      snapshot.style.transform = fit;
      snapshot.setAttribute("inert", "");
      snapshot.setAttribute("aria-hidden", "true");
      snapshot.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      marks.current?.replaceChildren(snapshot.cloneNode(true));
      snapshot.querySelectorAll(".notebook-attached-tabs").forEach((node) => node.remove());
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
      if (journey.returning && journey.destination !== "cover") {
        // A prateleira acabou de montar. Meça o encaixe com as lombadas na largura final.
        target.parentElement?.getAnimations({ subtree: true }).forEach((animation) => {
          if (animation instanceof CSSAnimation && animation.animationName === "notebook-shelf-in")
            animation.finish();
        });
        target.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
      const shelf =
        journey.returning && journey.destination !== "cover"
          ? notebookShelfPose(target, true)
          : undefined;
      const rect = shelf?.rect ?? target.getBoundingClientRect();
      const destination =
        journey.returning || journey.destination === "cover"
          ? rect
          : {
              x: back ? rect.x : rect.x + rect.width / 2,
              y: rect.y,
              width: rect.width / 2,
              height: rect.height,
            };
      const { from } = journey;
      const transport = `translate(${destination.x - from.x}px, ${destination.y - from.y}px) scale(${destination.width / from.width}, ${destination.height / from.height})`;
      const shelfRotationMs = 520;
      const shelfSlideMs = 580;
      const flight = shelf?.angle ? shelfRotationMs + shelfSlideMs : 360;
      const coverTurn = shelf?.angle ? 640 : NOTEBOOK_TURN_MS;
      const claspMs = 420;
      const duration = closed ? flight : coverTurn + flight + claspMs;
      const openingStart = (flight + claspMs) / duration;
      const claspOpeningStart = flight / duration;
      const coverClosingEnd = coverTurn / duration;
      const openingEnd = 0.998;
      const closingEnd = (coverTurn + claspMs) / duration;
      const shelfTurnEnd = (duration - flight + shelfRotationMs) / duration;
      const settle = "cubic-bezier(.35,0,.2,1)";
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
      const glide = "cubic-bezier(.4,0,.2,1)";
      // As marcações acompanham o miolo, fora do recorte que esconde as folhas.
      marks.current
        ?.querySelectorAll<HTMLElement>(`.notebook-attached-tab.is-${back ? "right" : "left"}`)
        .forEach((mark) => {
          const folded = `${(parseFloat(snapshot?.style.width ?? "0") / 2) * (back ? -1 : 1)}px`;
          animate(
            mark,
            journey.returning
              ? [
                  { translate: "0px" },
                  { translate: folded, offset: coverClosingEnd },
                  { translate: folded },
                ]
              : [
                  { translate: folded },
                  { translate: folded, offset: openingStart },
                  { translate: "0px", offset: openingEnd },
                  { translate: "0px" },
                ],
          );
        });
      const still = "translate(0px, 0px) scale(1, 1)";
      const shelfAngle = shelf?.angle ?? 0;
      const restingAngle = journey.shelfAngle ?? 0;
      const hasShelfTurn = shelfAngle !== 0;
      animate(
        element,
        journey.returning
          ? [
              { transform: still, "--shelf-angle": "0deg" },
              {
                transform: still,
                "--shelf-angle": "0deg",
                offset: closed ? 0 : closingEnd,
                easing: glide,
              },
              ...(hasShelfTurn
                ? [
                    {
                      transform: still,
                      "--shelf-angle": shelfAngle + "deg",
                      "--shelf-spine-scale": "1",
                      offset: shelfTurnEnd,
                      easing: settle,
                    },
                  ]
                : []),
              {
                transform: transport,
                "--shelf-angle": shelfAngle + "deg",
                "--shelf-spine-scale": String(from.width / destination.width),
              },
            ]
          : [
              { transform: still, "--shelf-angle": restingAngle + "deg", easing: glide },
              { transform: transport, "--shelf-angle": "0deg", offset: openingStart },
              ...(closed ? [] : [{ transform: transport, "--shelf-angle": "0deg" }]),
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
                  { "--cover-angle": "0deg", offset: coverClosingEnd },
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
      const clasp = element.querySelector<HTMLElement>(".notebook-journey-clasp");
      const openClasp = (journey.returning ? paper.current : target)?.querySelector<HTMLElement>(
        ".notebook-open-clasp",
      );
      const claspBounds = openClasp?.getBoundingClientRect();
      const claspScale = journey.returning ? 1 : destination.width / from.width;
      const claspRight = journey.returning
        ? from.x + from.width
        : destination.x + destination.width;
      const openGeometry = claspBounds
        ? {
            width: claspBounds.width / claspScale + "px",
            right: (claspRight - claspBounds.x) / claspScale + "px",
          }
        : { width: "29%", right: "-1px" };
      const closedGeometry = { width: "29%", right: "-1px" };
      animate(
        clasp,
        journey.returning
          ? [
              { transform: "translateZ(3px) rotateY(180deg)", ...openGeometry },
              {
                transform: "translateZ(3px) rotateY(180deg)",
                offset: coverClosingEnd,
                ...openGeometry,
                easing: NOTEBOOK_TURN_EASING,
              },
              { transform: "translateZ(3px) rotateY(0deg)", offset: closingEnd, ...closedGeometry },
              { transform: "translateZ(3px) rotateY(0deg)", ...closedGeometry },
            ]
          : [
              { transform: "translateZ(3px) rotateY(0deg)", ...closedGeometry },
              {
                transform: "translateZ(3px) rotateY(0deg)",
                offset: claspOpeningStart,
                ...closedGeometry,
                easing: NOTEBOOK_TURN_EASING,
              },
              {
                transform: "translateZ(3px) rotateY(180deg)",
                offset: openingStart,
                ...openGeometry,
              },
              { transform: "translateZ(3px) rotateY(180deg)", ...openGeometry },
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
      data-cover-theme={notebookCoverTheme(journey.notebook.coverStyle)}
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
      {(journey.shelfAngle !== undefined ||
        (journey.returning && journey.destination !== "cover")) && (
        <div className="notebook-spine__body book-cover__spine notebook-journey-spine">
          <i />
          <i />
          <i />
        </div>
      )}
      <div className="notebook-journey-book">
        <div className="notebook-journey-pages" ref={paper} />
        <div className="notebook-journey-marks" ref={marks} />
        <span className="book-cover__clasp-anchor" />
        <i className="notebook-journey-cast" />
        <div className="notebook-journey-leaf">
          {journey.side === "back" ? (
            <NotebookBackCover coverStyle={journey.notebook.coverStyle} subjectColor="#7C3AED" />
          ) : (
            <NotebookCover
              coverStyle={journey.notebook.coverStyle}
              subjectColor="#7C3AED"
              title={journey.notebook.title}
              clasp={false}
            />
          )}
          <i className="notebook-journey-shade is-front" />
          <div className="notebook-journey-lining" ref={lining} />
          <i className="notebook-journey-shade is-lining" />
        </div>
        <NotebookClasp className="notebook-journey-clasp" />
      </div>
    </div>,
    document.body,
  );
}
