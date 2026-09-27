import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { StudyNote } from "../domain/workspace";
import { NotebookToolIcon } from "./notebook-tool-icon";
import { PaperEditorIcon } from "./paper-editor-icon";
import { NotebookPageThumbnail } from "./notebook-page-thumbnail";

type NotebookPageIndexProps = {
  pages: readonly StudyNote[];
  currentPageId: string;
  onSelect: (id: string) => void;
  // Troca a folha de lugar com a vizinha. Sem ele o índice só leva à folha.
  onMove?: (id: string, direction: -1 | 1) => void;
  // Arrasta a miniatura direto para a posição solta. Funciona junto com onMove: o
  // arrastar é um atalho a mais, o teclado e o toque seguem com os botões.
  onReorder?: (id: string, toIndex: number) => void;
  // Folhas favoritas do caderno e o alternador de favorito por miniatura.
  favoritePageIds?: readonly string[];
  onToggleFavorite?: (id: string) => void;
  onClose: () => void;
};

// Distância mínima (em pixels) para um toque ou clique virar arrastar em vez de abrir a folha.
const DRAG_THRESHOLD = 8;

// Índice do caderno: miniaturas de todas as folhas, para ir a qualquer uma de uma vez, reordenar
// pelos botões (teclado e toque, sem depender de arrastar), arrastar a miniatura direto para o
// lugar desejado e favoritar folhas para achá-las rápido depois.
export function NotebookPageIndex({
  pages,
  currentPageId,
  onSelect,
  onMove,
  onReorder,
  favoritePageIds,
  onToggleFavorite,
  onClose,
}: NotebookPageIndexProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);

  const itemsRef = useRef(new Map<string, HTMLLIElement>());
  const dragRef = useRef<{
    pageId: string;
    fromIndex: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  // Aviso só para leitor de tela: mover, arrastar e favoritar já têm retorno visual (a
  // posição muda na tela), mas quem usa leitor de tela precisa ouvir o resultado sem ter
  // que navegar de volta até a miniatura para conferir.
  const [announcement, setAnnouncement] = useState("");

  const favorites = favoritePageIds ?? [];
  // Arrastar reordena pela posição entre todas as folhas; com o filtro de favoritas a lista
  // mostra só um recorte, então o arrastar fica desligado enquanto o filtro está ativo.
  const dragEnabled = Boolean(onReorder) && !favoritesOnly;
  const entries = pages
    .map((page, index) => ({ page, index }))
    .filter(({ page }) => !favoritesOnly || favorites.includes(page.id));

  function nearestIndex(x: number, y: number): number {
    let best = 0;
    let bestDistance = Infinity;
    pages.forEach((page, index) => {
      const element = itemsRef.current.get(page.id);
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const distance = Math.hypot(
        x - (rect.left + rect.width / 2),
        y - (rect.top + rect.height / 2),
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  }

  function endDrag() {
    dragRef.current = null;
    setDraggingId(null);
    setDropIndex(null);
  }

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>, pageId: string, index: number) {
    if (!dragEnabled || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pageId,
      fromIndex: index,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  }

  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (!active) return;
    if (!active.moved) {
      const distance = Math.hypot(event.clientX - active.startX, event.clientY - active.startY);
      if (distance < DRAG_THRESHOLD) return;
      active.moved = true;
      setDraggingId(active.pageId);
    }
    event.preventDefault();
    setDropIndex(nearestIndex(event.clientX, event.clientY));
  }

  function pointerUp() {
    const active = dragRef.current;
    if (!active) return;
    if (active.moved) {
      suppressClickRef.current = true;
      const target = dropIndex ?? active.fromIndex;
      if (target !== active.fromIndex) {
        onReorder?.(active.pageId, target);
        setAnnouncement(`Folha movida para a posição ${target + 1}.`);
      }
    }
    endDrag();
  }

  return (
    <dialog
      ref={dialog}
      className="notebook-page-index"
      aria-label="Índice de folhas"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
      <header>
        <div>
          <NotebookToolIcon name="index" />
          <h2>Índice de folhas</h2>
          <p>
            {entries.length} {entries.length === 1 ? "folha" : "folhas"}
            {favoritesOnly ? (entries.length === 1 ? " favorita" : " favoritas") : ""}
          </p>
        </div>
        <button
          type="button"
          className="notebook-index-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <PaperEditorIcon name="close" />
        </button>
      </header>
      {onToggleFavorite && (
        <button
          type="button"
          className="notebook-page-index__favorites-filter"
          aria-pressed={favoritesOnly}
          disabled={!favorites.length && !favoritesOnly}
          onClick={() => setFavoritesOnly((value) => !value)}
        >
          {favoritesOnly ? "Ver todas as folhas" : "Só favoritas"}
        </button>
      )}
      <ol>
        {entries.map(({ page, index }) => {
          const current = page.id === currentPageId;
          const thumbnail = page.assets[0];
          const favorited = favorites.includes(page.id);
          const classes = [
            current ? "is-current" : null,
            draggingId === page.id ? "is-dragging" : null,
            dragEnabled && dropIndex === index && draggingId && draggingId !== page.id
              ? "is-drop-target"
              : null,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li
              key={page.id}
              className={classes || undefined}
              ref={(element) => {
                if (element) itemsRef.current.set(page.id, element);
                else itemsRef.current.delete(page.id);
              }}
            >
              {onToggleFavorite && (
                <button
                  type="button"
                  className="notebook-page-index__favorite"
                  aria-pressed={favorited}
                  aria-label={
                    favorited
                      ? `Tirar a folha ${index + 1} dos favoritos`
                      : `Favoritar a folha ${index + 1}`
                  }
                  onClick={() => {
                    onToggleFavorite(page.id);
                    setAnnouncement(
                      favorited
                        ? `Folha ${index + 1} não é mais favorita.`
                        : `Folha ${index + 1} favoritada.`,
                    );
                  }}
                >
                  {favorited ? "★" : "☆"}
                </button>
              )}
              <button
                type="button"
                className="notebook-page-index__open"
                aria-current={current ? "page" : undefined}
                aria-label={`Folha ${index + 1}: ${page.title || "Sem título"}`}
                onPointerDown={(event) => pointerDown(event, page.id, index)}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={endDrag}
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  onSelect(page.id);
                  onClose();
                }}
              >
                <span className="notebook-page-index__thumb">
                  {thumbnail ? (
                    <NotebookPageThumbnail asset={thumbnail} />
                  ) : (
                    <span aria-hidden="true">{page.content.slice(0, 80) || "Folha em branco"}</span>
                  )}
                </span>
                <span className="notebook-page-index__label">
                  <strong>{index + 1}</strong>
                  <span>{page.title || "Sem título"}</span>
                </span>
              </button>
              {onMove && (
                <span className="notebook-page-index__move">
                  <button
                    type="button"
                    aria-label={`Mover a folha ${index + 1} para trás`}
                    disabled={index === 0}
                    onClick={() => {
                      onMove(page.id, -1);
                      setAnnouncement(`Folha movida para a posição ${index}.`);
                    }}
                  >
                    <img src="/paper-arrow.svg" alt="" className="is-previous" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Mover a folha ${index + 1} para frente`}
                    disabled={index === pages.length - 1}
                    onClick={() => {
                      onMove(page.id, 1);
                      setAnnouncement(`Folha movida para a posição ${index + 2}.`);
                    }}
                  >
                    <img src="/paper-arrow.svg" alt="" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </dialog>
  );
}
