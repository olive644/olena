import {
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  navigateWritingView,
  type WritingPageSize,
  type WritingView,
} from "../components/handwriting-writing-view";

export function useWritingWindowNavigation({
  canvasRef,
  view,
  page,
  tool,
  onNavigate,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  view: WritingView;
  page: WritingPageSize;
  tool: string;
  onNavigate: (view: WritingView) => void;
}) {
  const latest = useRef({ view, page, onNavigate });
  useLayoutEffect(() => {
    latest.current = { view, page, onNavigate };
  }, [view, page, onNavigate]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ id: number; x: number; y: number } | null>(null);
  const frame = useRef(0);

  const change = useCallback((next: WritingView) => {
    latest.current.view = next;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => latest.current.onNavigate(latest.current.view));
  }, []);
  const normalized = useCallback(
    (x: number, y: number) => {
      const bounds = canvasRef.current?.getBoundingClientRect();
      return {
        x: bounds?.width ? (x - bounds.left) / bounds.width : 0.5,
        y: bounds?.height ? (y - bounds.top) / bounds.height : 0.5,
      };
    },
    [canvasRef],
  );
  function navigate(fromX: number, fromY: number, toX: number, toY: number, zoom: number) {
    change(
      navigateWritingView(
        latest.current.view,
        latest.current.page,
        normalized(fromX, fromY),
        normalized(toX, toY),
        zoom,
      ),
    );
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
      if (event.ctrlKey || event.metaKey) {
        const point = normalized(event.clientX, event.clientY);
        change(
          navigateWritingView(
            latest.current.view,
            latest.current.page,
            point,
            point,
            latest.current.view.zoom * Math.exp(-event.deltaY * unit * 0.002),
          ),
        );
      } else {
        const bounds = canvas.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const dx = ((event.shiftKey ? event.deltaY : event.deltaX) * unit) / bounds.width;
        const dy = ((event.shiftKey ? 0 : event.deltaY) * unit) / bounds.height;
        change(
          navigateWritingView(
            latest.current.view,
            latest.current.page,
            { x: dx, y: dy },
            { x: 0, y: 0 },
            latest.current.view.zoom,
          ),
        );
      }
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const aspect = bounds.width / bounds.height;
      if (Math.abs((latest.current.view.aspect ?? 500 / 185) - aspect) < 0.001) return;
      change(
        navigateWritingView(
          latest.current.view,
          latest.current.page,
          { x: 0.5, y: 0.5 },
          { x: 0.5, y: 0.5 },
          latest.current.view.zoom,
          aspect,
        ),
      );
    };
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(resize);
    observer?.observe(canvas);
    resize();
    const touches = pointers.current;
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", wheel);
      observer?.disconnect();
      cancelAnimationFrame(frame.current);
      touches.clear();
      pan.current = null;
    };
  }, [canvasRef, change, normalized]);

  return {
    start(event: ReactPointerEvent<HTMLCanvasElement>) {
      if (event.pointerType === "touch") {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        return true;
      }
      if (event.button === 1 || tool === "hand") {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        pan.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        return true;
      }
      if ((tool === "zoom-in" || tool === "zoom-out") && event.button === 0) {
        const point = normalized(event.clientX, event.clientY);
        change(
          navigateWritingView(
            latest.current.view,
            latest.current.page,
            point,
            point,
            latest.current.view.zoom * (tool === "zoom-in" ? 1.2 : 1 / 1.2),
          ),
        );
        return true;
      }
      return false;
    },
    move(event: ReactPointerEvent<HTMLCanvasElement>) {
      const currentPan = pan.current;
      if (currentPan?.id === event.pointerId) {
        navigate(
          currentPan.x,
          currentPan.y,
          event.clientX,
          event.clientY,
          latest.current.view.zoom,
        );
        pan.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        return true;
      }
      if (!pointers.current.has(event.pointerId)) return false;
      const before = [...pointers.current.values()].slice(0, 2);
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const after = [...pointers.current.values()].slice(0, 2);
      const center = (points: { x: number; y: number }[]) => ({
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      });
      const oldCenter = center(before),
        newCenter = center(after);
      const distance = (points: { x: number; y: number }[]) =>
        points.length < 2
          ? 0
          : Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y);
      const oldDistance = distance(before);
      const scale = oldDistance > 0 ? distance(after) / oldDistance : 1;
      navigate(
        oldCenter.x,
        oldCenter.y,
        newCenter.x,
        newCenter.y,
        latest.current.view.zoom * scale,
      );
      return true;
    },
    end(event: ReactPointerEvent<HTMLCanvasElement>) {
      const touch = pointers.current.delete(event.pointerId);
      const middle = pan.current?.id === event.pointerId;
      if (middle) pan.current = null;
      if ((touch || middle) && event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      return touch || middle;
    },
  };
}
