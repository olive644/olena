import { useRef, useState, type PointerEvent } from "react";
import type { StudyNotebook } from "../domain/workspace";

export function useNotebookShelfDrag(
  notebooks: StudyNotebook[],
  store: (id: string, folderId: string | null) => void,
) {
  const gesture = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const suppressedClick = useRef<string | null>(null);
  const [moving, setMoving] = useState<{ id: string; x: number; y: number } | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  function suppressReleaseClick(id: string) {
    suppressedClick.current = id;
    // O clique de pointerup ocorre antes da próxima tarefa. Não bloquear Enter depois dele.
    setTimeout(() => {
      if (suppressedClick.current === id) suppressedClick.current = null;
    }, 0);
  }
  function clear() {
    gesture.current = null;
    setMoving(null);
    setTargetId(null);
  }
  function destination(x: number, y: number) {
    return document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-folder-drop]")?.dataset[
      "folderDrop"
    ];
  }
  return {
    moving,
    targetId,
    message,
    consumeClick(id: string) {
      if (suppressedClick.current !== id) return false;
      suppressedClick.current = null;
      return true;
    },
    handlers(id: string) {
      return {
        onDragStart: (event: React.DragEvent) => event.preventDefault(),
        onPointerDown(event: PointerEvent<HTMLButtonElement>) {
          if (event.button !== 0) return;
          suppressedClick.current = null;
          gesture.current = { id, x: event.clientX, y: event.clientY, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        },
        onPointerMove(event: PointerEvent<HTMLButtonElement>) {
          const current = gesture.current;
          if (!current || current.id !== id) return;
          if (
            !current.moved &&
            Math.hypot(event.clientX - current.x, event.clientY - current.y) < 8
          )
            return;
          current.moved = true;
          setMoving({ id, x: event.clientX, y: event.clientY });
          setTargetId(destination(event.clientX, event.clientY) ?? null);
          const shelf = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest(".notebook-shelf");
          if (shelf) {
            const rect = shelf.getBoundingClientRect();
            if (event.clientX > rect.right - 36) shelf.scrollLeft += 18;
            if (event.clientX < rect.left + 36) shelf.scrollLeft -= 18;
          }
        },
        onPointerUp(event: PointerEvent<HTMLButtonElement>) {
          const current = gesture.current;
          if (!current || current.id !== id) return;
          if (current.moved) {
            suppressReleaseClick(id);
            const folderId = destination(event.clientX, event.clientY);
            const book = notebooks.find((item) => item.id === id);
            if (folderId && folderId !== book?.parentId) {
              if (notebooks.filter((item) => item.parentId === folderId && !item.kind).length < 3) {
                store(id, folderId);
                setMessage(
                  `Caderno guardado em ${notebooks.find((item) => item.id === folderId)?.title}.`,
                );
              } else setMessage("Esta pasta já tem três cadernos. Escolha outra pasta.");
            } else if (
              !folderId &&
              book?.parentId &&
              document
                .elementFromPoint(event.clientX, event.clientY)
                ?.closest(".notebooks-showcase")
            ) {
              store(id, null);
              setMessage("Caderno retirado da pasta e colocado na vitrine.");
            }
          }
          clear();
        },
        onPointerCancel() {
          if (gesture.current?.moved) suppressReleaseClick(id);
          clear();
        },
        onKeyDown(event: React.KeyboardEvent) {
          if (event.key === "Escape") {
            if (gesture.current?.moved) suppressReleaseClick(id);
            clear();
          }
        },
      };
    },
  };
}
