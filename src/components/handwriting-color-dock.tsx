import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
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
  const [minimized, setMinimized] = useState(false);
  const moved = useRef(false);
  const morphFrom = useRef<{ width: number; height: number } | null>(null);
  function toggleMinimized(next: boolean) {
    const r = root.current?.getBoundingClientRect();
    if (r) morphFrom.current = { width: r.width, height: r.height };
    setMinimized(next);
  }
  useLayoutEffect(() => {
    const node = root.current,
      from = morphFrom.current;
    if (!node || !from) return;
    morphFrom.current = null;
    if (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset["reduceMotion"] === "true"
    )
      return;
    node.animate?.(
      [
        { width: from.width + "px", height: from.height + "px", borderRadius: "8px 14px 8px 12px" },
        {
          width: node.offsetWidth + "px",
          height: node.offsetHeight + "px",
          borderRadius: minimized ? "14px" : "8px 14px 8px 12px",
        },
      ],
      { duration: 320, easing: "cubic-bezier(.22,1,.36,1)" },
    );
  }, [minimized]);
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
    const arrows = [
      ...(parent.closest(".handwriting-studio") ?? parent).querySelectorAll<HTMLElement>(
        ".handwriting-paper-disclosure, .handwriting-brush-disclosure, .handwriting-page-navigation__toggle",
      ),
    ];
    return {
      area: { ...local(bounds), width: viewport.clientWidth, height: viewport.clientHeight },
      size: { width: node.offsetWidth, height: node.offsetHeight },
      obstacle: arrows
        .map((arrow) => arrow.getBoundingClientRect())
        .filter((rect) => rect.width && rect.height)
        .map(local),
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
      if (box && !drag.current) {
        if (minimized)
          setPosition((old) => {
            const x = Math.max(
              box.area.x + 8,
              Math.min(old.x, box.area.x + box.area.width - box.size.width - 8),
            );
            let y = Math.max(
              box.area.y + 8,
              Math.min(old.y, box.area.y + box.area.height - box.size.height - 8),
            );
            for (const a of box.obstacle)
              if (
                x < a.x + a.width + 8 &&
                x + box.size.width + 8 > a.x &&
                y < a.y + a.height + 8 &&
                y + box.size.height + 8 > a.y
              ) {
                y =
                  a.y - box.size.height - 8 >= box.area.y + 8
                    ? a.y - box.size.height - 8
                    : a.y + a.height + 8;
              }
            return old.x === x && old.y === y ? old : { x, y };
          });
        else
          setPosition(placeColorDock(box.area, box.size, dock.edge, dock.fraction, box.obstacle));
      }
    };
    place();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(place);
    observer?.observe(viewport);
    observer?.observe(node);
    const studio = parent?.closest(".handwriting-studio") ?? parent;
    studio
      ?.querySelectorAll(
        ".handwriting-paper-disclosure, .handwriting-brush-disclosure, .handwriting-page-navigation__toggle",
      )
      .forEach((arrow) => observer?.observe(arrow));
    const changes =
      typeof MutationObserver === "undefined" ? undefined : new MutationObserver(place);
    if (studio)
      changes?.observe(studio, {
        subtree: true,
        attributes: true,
        attributeFilter: ["aria-expanded", "data-expanded", "data-tool"],
      });
    window.addEventListener("resize", place);
    return () => {
      observer?.disconnect();
      changes?.disconnect();
      window.removeEventListener("resize", place);
      cancelAnimationFrame(frame.current);
      drag.current = null;
      delete node.dataset["dragging"];
    };
  }, [active, dock, measure, minimized]);

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
    if (minimized) {
      setPosition({ x: current.x, y: current.y });
      setDock({ ...dock });
      return;
    }
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
      data-minimized={minimized || undefined}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <button
        type="button"
        className="handwriting-color-dock-grip"
        aria-label={uiText(minimized ? "Abrir estojo de cores" : "Mover paleta de cores")}
        aria-expanded={minimized ? false : undefined}
        onClick={() => {
          if (minimized && !moved.current) toggleMinimized(false);
        }}
        onKeyDown={(event) => {
          const edge = (
            { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "top", ArrowDown: "bottom" } as const
          )[event.key as "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown"];
          if (!edge) return;
          event.preventDefault();
          if (minimized) {
            setPosition((old) => ({
              x: old.x + (edge === "right" ? 20 : edge === "left" ? -20 : 0),
              y: old.y + (edge === "bottom" ? 20 : edge === "top" ? -20 : 0),
            }));
          } else setDock({ edge, fraction: 0.5 });
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const box = measure();
          if (!box) return;
          event.preventDefault();
          event.stopPropagation();
          moved.current = false;
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
          if (
            Math.hypot(
              event.clientX - current.startX - position.x,
              event.clientY - current.startY - position.y,
            ) > 4
          )
            moved.current = true;
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
        {minimized ? (
          <img src="/navigation-icons/paper/color-case.svg?v=2" alt="" width="40" height="40" />
        ) : (
          <span aria-hidden="true">⠿</span>
        )}
      </button>
      {active && !minimized && (
        <HandwritingQuickColors color={color} onColorChange={onColorChange} />
      )}{" "}
      {!minimized && (
        <button
          type="button"
          className="handwriting-color-dock-minimize"
          aria-label={uiText("Minimizar paleta de cores")}
          onClick={() => toggleMinimized(true)}
        >
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="m5 10 11 7 11-7v6l-11 8L5 16Z" fill="#8c53ea" />
            <path d="m5 10 4-3 7 5 7-5 4 3-11 8Z" fill="#c8a2ff" />
            <path d="m16 18 11-8v6l-11 8Z" fill="#6130a8" />
          </svg>
        </button>
      )}
    </div>
  );
}
