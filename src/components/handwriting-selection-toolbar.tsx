import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { selectionToolbarPosition } from "./handwriting-selection-layout";
import type { SelectionBox } from "./handwriting-types";

export function HandwritingSelectionToolbar({
  selection,
  canvasRef,
  viewportRef,
  depth,
  children,
  onRotationSideChange,
}: {
  selection: SelectionBox;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  depth: number;
  children: ReactNode;
  onRotationSideChange: (side: "top" | "left" | "right") => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number; below: boolean }>();
  useLayoutEffect(() => {
    const toolbar = ref.current;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!toolbar || !canvas || !viewport) return;
    let frame = 0;
    function update() {
      frame = 0;
      if (!toolbar || !canvas || !viewport) return;
      const page = canvas.getBoundingClientRect();
      const view = viewport.getBoundingClientRect();
      const size = toolbar.getBoundingClientRect();
      const pageWidth = Number(canvas.dataset["pageWidth"]) || 1200;
      const scale = page.width / pageWidth;
      const next = selectionToolbarPosition(
        {
          x: selection.x * scale,
          y: selection.y * scale,
          width: selection.width * scale,
          height: selection.height * scale,
        },
        {
          x: Math.max(0, view.left - page.left),
          y: Math.max(0, view.top - page.top),
          width: Math.min(view.right, page.right) - Math.max(view.left, page.left),
          height: Math.min(view.bottom, page.bottom) - Math.max(view.top, page.top),
        },
        { width: size.width, height: size.height },
      );
      setPosition(next);
      const menu = toolbar.querySelector<HTMLElement>(
        "details[open] .handwriting-selection-float__menu",
      );
      if (menu) {
        const bottom = page.top + next.y + size.height;
        const below = view.bottom - bottom - 12;
        const above = page.top + next.y - view.top - 12;
        const openAbove = below < 180 && above > below;
        menu.style.top = openAbove ? "auto" : "calc(100% + 8px)";
        menu.style.bottom = openAbove ? "calc(100% + 8px)" : "auto";
        menu.style.maxHeight = Math.max(44, Math.min(260, openAbove ? above : below)) + "px";
      }
      onRotationSideChange(
        next.below
          ? selection.x * scale + selection.width * scale + 44 < view.right - page.left
            ? "right"
            : "left"
          : "top",
      );
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    observer?.observe(canvas);
    observer?.observe(toolbar);
    viewport.addEventListener("scroll", schedule, { passive: true });
    toolbar.addEventListener("toggle", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      observer?.disconnect();
      viewport.removeEventListener("scroll", schedule);
      toolbar.removeEventListener("toggle", schedule, true);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [
    selection.x,
    selection.y,
    selection.width,
    selection.height,
    canvasRef,
    viewportRef,
    onRotationSideChange,
  ]);
  return (
    <div
      ref={ref}
      className={`handwriting-selection-float${position?.below ? " is-below" : ""}`}
      style={{
        zIndex: depth,
        left: position?.x ?? 0,
        top: position?.y ?? 0,
        visibility: position ? undefined : "hidden",
      }}
    >
      {children}
    </div>
  );
}
