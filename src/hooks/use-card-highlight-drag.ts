import { useRef, useState, type PointerEvent } from "react";
import type { ArcanaId } from "../data/arcana-ids";
import { placeAchievementFavorite } from "../domain/achievement-presentation";

export function useCardHighlightDrag(
  favorites: readonly string[],
  earned: ReadonlySet<string>,
  save: (ids: string[]) => void,
) {
  const start = useRef<{ id: ArcanaId; x: number; y: number; dialog: Element | null } | undefined>(
    undefined,
  );
  const moved = useRef(false);
  const [ghost, setGhost] = useState<{ id: ArcanaId; x: number; y: number }>();
  const [target, setTarget] = useState<number | "remove">();
  function destination(event: PointerEvent<HTMLButtonElement>) {
    const node = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-arcana-slot], [data-arcana-remove]");
    if (!node || !start.current?.dialog?.contains(node)) return undefined;
    return node.hasAttribute("data-arcana-remove")
      ? ("remove" as const)
      : Number(node.dataset["arcanaSlot"]);
  }
  function reset() {
    start.current = undefined;
    setGhost(undefined);
    setTarget(undefined);
  }
  return {
    ghost,
    target,
    suppressClick() {
      const value = moved.current;
      moved.current = false;
      return value;
    },
    events(id: ArcanaId) {
      return {
        onPointerDown(event: PointerEvent<HTMLButtonElement>) {
          moved.current = false;
          if (event.button !== 0 || !earned.has(id)) return;
          if (
            event.pointerType === "touch" &&
            !event.currentTarget.closest(".arcana-feature-slot") &&
            !event.currentTarget.classList.contains("arcana-favorite-handle")
          )
            return;
          start.current = {
            id,
            x: event.clientX,
            y: event.clientY,
            dialog: event.currentTarget.closest("dialog"),
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
          setGhost({ id: origin.id, x: event.clientX, y: event.clientY });
          setTarget(destination(event));
        },
        onPointerUp(event: PointerEvent<HTMLButtonElement>) {
          const origin = start.current;
          const slot = origin && moved.current ? destination(event) : undefined;
          if (origin && slot !== undefined) {
            if (slot === "remove") save(favorites.filter((id) => id !== origin.id));
            else save(placeAchievementFavorite(favorites, origin.id, slot, earned));
          }
          reset();
        },
        onPointerCancel: reset,
      };
    },
  };
}
