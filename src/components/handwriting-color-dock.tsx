import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { HandwritingQuickColors } from "./handwriting-quick-colors";
import { uiText } from "../i18n/runtime";
import {
  nearestColorDockEdge,
  placeColorDock,
  type ColorDockEdge,
  type ColorDockBox,
} from "./handwriting-color-dock-position";

export function HandwritingColorDock({
  active,
  color,
  onColorChange,
}: {
  active: boolean;
  color: string;
  onColorChange: (color: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [dock, setDock] = useState<{ edge: ColorDockEdge; fraction: number }>({
    edge: "left",
    fraction: 0,
  });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    area: ColorDockBox;
    size: { width: number; height: number };
  } | null>(null);
  const frame = useRef(0);
  const measure = useCallback(() => {
    const node = root.current;
    const parent = node?.offsetParent;
    if (!node || !(parent instanceof HTMLElement)) return;
    const viewport = parent.querySelector<HTMLElement>(".handwriting-viewport");
    if (!viewport) return;
    const origin = parent.getBoundingClientRect();
    const bounds = viewport.getBoundingClientRect();
    const local = (rect: DOMRect) => ({
      x: rect.left - origin.left - parent.clientLeft,
      y: rect.top - origin.top - parent.clientTop,
      width: rect.width,
      height: rect.height,
    });
    const arrow = parent.querySelector<HTMLElement>(".handwriting-paper-disclosure");
    const arrowBounds = arrow?.getBoundingClientRect();
    return {
      area: { ...local(bounds), width: viewport.clientWidth, height: viewport.clientHeight },
      size: { width: node.offsetWidth, height: node.offsetHeight },
      obstacle: arrowBounds && arrowBounds.width ? local(arrowBounds) : undefined,
    };
  }, []);

  useLayoutEffect(() => {
    if (!active) return;
    const node = root.current;
    const parent = node?.parentElement;
    const viewport = parent?.querySelector<HTMLElement>(".handwriting-viewport");
    if (!node || !viewport) return;
    const place = () => {
      // A paleta muda de orientação antes da medição.
      node.style.maxWidth = Math.max(0, viewport.clientWidth - 16) + "px";
      node.style.maxHeight = Math.max(0, viewport.clientHeight - 16) + "px";
      const box = measure();
      if (box && !drag.current)
        setPosition(placeColorDock(box.area, box.size, dock.edge, dock.fraction, box.obstacle));
    };
    place();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(place);
    observer?.observe(viewport);
    observer?.observe(node);
    const arrow = parent?.querySelector<HTMLElement>(".handwriting-paper-disclosure");
    if (arrow) observer?.observe(arrow);
    window.addEventListener("resize", place);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      cancelAnimationFrame(frame.current);
      drag.current = null;
      delete node.dataset["dragging"];
    };
  }, [active, dock, measure]);

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    cancelAnimationFrame(frame.current);
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    delete root.current?.dataset["dragging"];
    const box = measure();
    if (!box) return;
    const edge =
      event.type !== "pointerup"
        ? dock.edge
        : nearestColorDockEdge(
            event.clientX - (root.current?.parentElement?.getBoundingClientRect().left ?? 0),
            event.clientY - (root.current?.parentElement?.getBoundingClientRect().top ?? 0),
            box.area,
          );
    const horizontal = edge === "top" || edge === "bottom";
    const fraction = Math.max(
      0,
      Math.min(
        1,
        horizontal
          ? (current.x - box.area.x) / Math.max(1, box.area.width - box.size.width)
          : (current.y - box.area.y) / Math.max(1, box.area.height - box.size.height),
      ),
    );
    setPosition({ x: current.x, y: current.y });
    setDock({ edge, fraction });
  }

  return (
    <div
      ref={root}
      hidden={!active}
      className="handwriting-color-dock"
      data-edge={dock.edge}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <button
        type="button"
        className="handwriting-color-dock-grip"
        aria-label={uiText("Mover paleta de cores")}
        onKeyDown={(event) => {
          const edge = (
            { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "top", ArrowDown: "bottom" } as const
          )[event.key as "ArrowLeft"];
          if (!edge) return;
          event.preventDefault();
          setDock({ edge, fraction: 0.5 });
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const box = measure();
          if (!box) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            area: box.area,
            size: box.size,
            id: event.pointerId,
            x: position.x,
            y: position.y,
            startX: event.clientX - position.x,
            startY: event.clientY - position.y,
          };
          if (root.current) root.current.dataset["dragging"] = "true";
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current || current.id !== event.pointerId) return;
          const box = current;
          current.x = Math.max(
            box.area.x,
            Math.min(event.clientX - current.startX, box.area.x + box.area.width - box.size.width),
          );
          current.y = Math.max(
            box.area.y,
            Math.min(
              event.clientY - current.startY,
              box.area.y + box.area.height - box.size.height,
            ),
          );
          cancelAnimationFrame(frame.current);
          frame.current = requestAnimationFrame(() => {
            if (root.current && drag.current)
              root.current.style.transform = `translate(${current.x}px, ${current.y}px)`;
          });
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      >
        <span aria-hidden="true">⠿</span>
      </button>
      {active && <HandwritingQuickColors color={color} onColorChange={onColorChange} />}
    </div>
  );
}
