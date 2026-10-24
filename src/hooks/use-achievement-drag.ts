import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Achievement } from "../domain/math-achievements";
import { placeAchievementFavorite } from "../domain/achievement-presentation";
import { createMathSound } from "../data/math-sound";

export function useAchievementDrag(
  featured: readonly string[],
  earned: ReadonlySet<string>,
  onChange: ((ids: string[]) => void) | undefined,
  onError: () => void,
) {
  const [ghost, setGhost] = useState<{ item: Achievement; x: number; y: number }>();
  const [target, setTarget] = useState<number>();
  const [landed, setLanded] = useState<{ slot: number; tick: number }>();
  const start = useRef<
    { item: Achievement; x: number; y: number; gallery: Element | null } | undefined
  >(undefined);
  const moved = useRef(false);
  const sound = useRef<ReturnType<typeof createMathSound> | null>(null);
  useEffect(() => {
    const audio = createMathSound();
    sound.current = audio;
    return () => audio.dispose();
  }, []);
  useEffect(() => {
    if (!landed) return;
    const timer = window.setTimeout(() => setLanded(undefined), 700);
    return () => clearTimeout(timer);
  }, [landed]);
  function destination(event: PointerEvent<HTMLButtonElement>) {
    const node = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-achievement-slot]");
    return node && start.current?.gallery?.contains(node)
      ? Number(node.dataset["achievementSlot"])
      : undefined;
  }
  function reset() {
    start.current = undefined;
    setGhost(undefined);
    setTarget(undefined);
  }
  return {
    ghost,
    target,
    landed,
    suppressClick() {
      const value = moved.current;
      moved.current = false;
      return value;
    },
    events(item: Achievement) {
      return {
        onPointerDown(event: PointerEvent<HTMLButtonElement>) {
          moved.current = false;
          if (
            !onChange ||
            !earned.has(item.id) ||
            event.button !== 0 ||
            !(event.target as Element).closest(".math-achievement-art")
          )
            return;
          sound.current?.unlock();
          start.current = {
            item,
            x: event.clientX,
            y: event.clientY,
            gallery: event.currentTarget.closest(".achievement-gallery"),
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        },
        onPointerMove(event: PointerEvent<HTMLButtonElement>) {
          const origin = start.current;
          if (
            !origin ||
            (!moved.current && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 7)
          )
            return;
          event.preventDefault();
          moved.current = true;
          setGhost({ item: origin.item, x: event.clientX, y: event.clientY });
          setTarget(destination(event));
        },
        onPointerUp(event: PointerEvent<HTMLButtonElement>) {
          const origin = start.current;
          const slot = origin && moved.current ? destination(event) : undefined;
          if (origin && slot !== undefined && onChange) {
            try {
              onChange(placeAchievementFavorite(featured, origin.item.id, slot, earned));
              setLanded({ slot, tick: performance.now() });
              sound.current?.play("achievementPlace");
            } catch {
              onError();
            }
          }
          reset();
        },
        onPointerCancel: reset,
      };
    },
  };
}
