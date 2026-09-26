import { useRef, type RefObject } from "react";

type TouchLike = { pointerId: number; clientX: number; clientY: number };

type PinchInput = {
  viewportRef: RefObject<HTMLElement | null>;
  zoom: number;
  zoomTo: (clientX: number, clientY: number, nextZoom: number) => void;
  // Chamado quando o segundo dedo toca: quem desenha precisa largar o traço que estava fazendo.
  onPinchStart: () => void;
};

// Pinça com dois dedos: aproximar dá zoom e mover os dedos rola a folha. O editor só repassa os
// eventos de toque.
export function usePinchZoom({ viewportRef, zoom, zoomTo, onPinchStart }: PinchInput) {
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{
    distance: number;
    zoom: number;
    centerX: number;
    centerY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  // Devolve true quando este toque começou uma pinça (o segundo dedo).
  function start(event: TouchLike): boolean {
    touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.current.size < 2) return false;
    const [first, second] = [...touches.current.values()].slice(0, 2);
    if (!first || !second) return false;
    const viewport = viewportRef.current;
    pinch.current = {
      distance: Math.hypot(second.x - first.x, second.y - first.y),
      zoom,
      centerX: (first.x + second.x) / 2,
      centerY: (first.y + second.y) / 2,
      scrollLeft: viewport?.scrollLeft ?? 0,
      scrollTop: viewport?.scrollTop ?? 0,
    };
    onPinchStart();
    return true;
  }

  // Devolve true quando o movimento fez parte da pinça (e já foi aplicado).
  function move(event: TouchLike): boolean {
    touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = pinch.current;
    if (!current || touches.current.size < 2) return false;
    const [first, second] = [...touches.current.values()].slice(0, 2);
    if (!first || !second || current.distance <= 0) return false;
    const centerX = (first.x + second.x) / 2;
    const centerY = (first.y + second.y) / 2;
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollLeft = current.scrollLeft + current.centerX - centerX;
      viewport.scrollTop = current.scrollTop + current.centerY - centerY;
    }
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    zoomTo(centerX, centerY, current.zoom * (distance / current.distance));
    return true;
  }

  function end(pointerId: number): void {
    touches.current.delete(pointerId);
    if (pinch.current && touches.current.size < 2) pinch.current = null;
  }

  return { start, move, end };
}
