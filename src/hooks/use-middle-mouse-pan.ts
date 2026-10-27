import { useRef, type PointerEvent } from "react";

export function useMiddleMousePan() {
  const pan = useRef<{ pointer: number; x: number; y: number; left: number; top: number } | null>(
    null,
  );
  function stop(event: PointerEvent<HTMLDivElement>) {
    if (pan.current?.pointer !== event.pointerId) return;
    pan.current = null;
    event.currentTarget.removeAttribute("data-middle-pan");
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    event.stopPropagation();
  }
  return {
    onPointerDownCapture(event: PointerEvent<HTMLDivElement>) {
      if (event.pointerType !== "mouse" || event.button !== 1 || event.buttons !== 4) return;
      event.preventDefault();
      event.stopPropagation();
      const viewport = event.currentTarget;
      pan.current = {
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
      viewport.setAttribute("data-middle-pan", "true");
      viewport.setPointerCapture(event.pointerId);
    },
    onPointerMoveCapture(event: PointerEvent<HTMLDivElement>) {
      const active = pan.current;
      if (!active || active.pointer !== event.pointerId) return;
      if (!(event.buttons & 4)) {
        stop(event);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.scrollLeft = active.left - (event.clientX - active.x);
      event.currentTarget.scrollTop = active.top - (event.clientY - active.y);
    },
    onPointerUpCapture: stop,
    onPointerCancelCapture: stop,
    onLostPointerCapture: stop,
    onAuxClick(event: React.MouseEvent<HTMLDivElement>) {
      if (event.button === 1) event.preventDefault();
    },
  };
}
