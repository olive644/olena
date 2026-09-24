import { reviewPortugueseText } from "../domain/text-review";
import type { HandwritingSticky } from "../domain/handwriting";
import type { PointerEvent as ReactPointerEvent } from "react";
import { stickyHeight, stickyWidth } from "./handwriting-geometry";
import { PAGE_HEIGHT, PAGE_WIDTH } from "./handwriting-types";
import { PaperEditorIcon } from "./paper-editor-icon";

type StickyColor = HandwritingSticky["color"];

type HandwritingStickyNoteProps = {
  sticky: HandwritingSticky;
  isSelected: boolean;
  ignorePointer: boolean;
  menuOpen: boolean;
  colorMenuOpen: boolean;
  textAutoCorrect: boolean;
  onRemember: () => void;
  onUpdate: (change: Partial<HandwritingSticky>) => void;
  onDragStart: (event: ReactPointerEvent<HTMLElement>, sticky: HandwritingSticky) => void;
  onDragMove: (event: ReactPointerEvent<HTMLElement>, sticky: HandwritingSticky) => void;
  onDragEnd: () => void;
  onResizeStart: (event: ReactPointerEvent<HTMLButtonElement>, sticky: HandwritingSticky) => void;
  onResizeMove: (event: ReactPointerEvent<HTMLButtonElement>, sticky: HandwritingSticky) => void;
  onResizeEnd: () => void;
  onToggleMenu: () => void;
  onToggleColorMenu: () => void;
  onMoveMode: () => void;
  onToggleChecklist: () => void;
  onChangeColor: (color: StickyColor) => void;
  onLayer: (direction: "front" | "back") => void;
  onRemove: () => void;
  onUpdateChecklistItem: (itemId: string, change: { text?: string; done?: boolean }) => void;
  onRemoveChecklistItem: (itemId: string) => void;
  onAddChecklistItem: () => void;
};

export function HandwritingStickyNote({
  sticky,
  isSelected,
  ignorePointer,
  menuOpen,
  colorMenuOpen,
  textAutoCorrect,
  onRemember,
  onUpdate,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  onToggleMenu,
  onToggleColorMenu,
  onMoveMode,
  onToggleChecklist,
  onChangeColor,
  onLayer,
  onRemove,
  onUpdateChecklistItem,
  onRemoveChecklistItem,
  onAddChecklistItem,
}: HandwritingStickyNoteProps) {
  return (
    <div
      className={`handwriting-sticky handwriting-sticky--${sticky.kind === "text" ? "text" : sticky.color}${sticky.formula ? " handwriting-sticky--formula" : ""}${isSelected ? " is-selected" : ""}`}
      style={{
        pointerEvents: ignorePointer ? "none" : undefined,
        left: `${(sticky.x / PAGE_WIDTH) * 100}%`,
        top: `${(sticky.y / PAGE_HEIGHT) * 100}%`,
        width: `${(stickyWidth(sticky) / PAGE_WIDTH) * 100}%`,
        height: `${(stickyHeight(sticky) / PAGE_HEIGHT) * 100}%`,
        ...(sticky.kind === "text" ? { color: sticky.ink ?? "#17151c" } : {}),
      }}
      key={sticky.id}
    >
      <div className="handwriting-sticky__bar">
        <span
          className="handwriting-sticky__drag-hint"
          role="button"
          tabIndex={0}
          aria-label={sticky.kind === "text" ? "Mover texto" : "Mover post-it"}
          onKeyDown={(event) => {
            const movement: Record<string, [number, number]> = {
              ArrowLeft: [-10, 0],
              ArrowRight: [10, 0],
              ArrowUp: [0, -10],
              ArrowDown: [0, 10],
            };
            const delta = movement[event.key];
            if (!delta) return;
            event.preventDefault();
            onRemember();
            onUpdate({
              x: Math.max(0, Math.min(PAGE_WIDTH - stickyWidth(sticky), sticky.x + delta[0])),
              y: Math.max(0, Math.min(PAGE_HEIGHT - stickyHeight(sticky), sticky.y + delta[1])),
            });
          }}
          onPointerDown={(event) => onDragStart(event, sticky)}
          onPointerMove={(event) => onDragMove(event, sticky)}
          onPointerUp={() => {
            onDragEnd();
          }}
          onPointerCancel={() => {
            onDragEnd();
          }}
        >
          {sticky.kind === "text" ? "Texto" : sticky.checklist?.length ? "Checklist" : "Nota"}
        </span>
        <button
          type="button"
          className="handwriting-sticky__menu-trigger"
          aria-label="Opções do post-it"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onToggleMenu}
        >
          <PaperEditorIcon name="more" />
        </button>
      </div>
      {menuOpen && (
        <div
          className="handwriting-sticky__menu"
          role="menu"
          aria-label="Opções do post-it"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => onMoveMode()}>
            <PaperEditorIcon name="hand" /> Mover
          </button>
          {sticky.kind !== "text" && (
            <button
              type="button"
              className={sticky.checklist?.length ? "is-active" : undefined}
              aria-pressed={Boolean(sticky.checklist?.length)}
              onClick={onToggleChecklist}
            >
              <PaperEditorIcon name="review" />
              {sticky.checklist?.length ? "Voltar para nota" : "Checklist"}
            </button>
          )}
          {sticky.kind !== "text" && (
            <div className="handwriting-sticky__menu-group">
              <button type="button" aria-expanded={colorMenuOpen} onClick={onToggleColorMenu}>
                <PaperEditorIcon name="sticky" /> Cores
              </button>
              {colorMenuOpen && (
                <div className="handwriting-sticky__menu-colors" aria-label="Cores disponíveis">
                  {(["yellow", "blue", "lilac"] as const).map((nextColor) => (
                    <button
                      key={nextColor}
                      type="button"
                      className={sticky.color === nextColor ? "is-active" : ""}
                      aria-label={`Usar cor ${nextColor === "yellow" ? "amarela" : nextColor === "blue" ? "azul" : "lilás"}`}
                      onClick={() => onChangeColor(nextColor)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {sticky.kind !== "text" && (
            <>
              <button type="button" onClick={() => onLayer("front")}>
                <PaperEditorIcon name="bringFront" /> Trazer para frente
              </button>
              <button type="button" onClick={() => onLayer("back")}>
                <PaperEditorIcon name="sendBack" /> Enviar para trás
              </button>
            </>
          )}
          <button type="button" className="handwriting-sticky__menu-danger" onClick={onRemove}>
            <PaperEditorIcon name="close" /> Remover
          </button>
        </div>
      )}
      {sticky.checklist?.length ? (
        <div className="handwriting-sticky__checklist">
          <input
            aria-label="Título do checklist"
            value={sticky.text}
            maxLength={80}
            onFocus={() => onRemember()}
            onChange={(event) => onUpdate({ text: event.target.value })}
            placeholder="Título"
          />
          {sticky.checklist.map((item) => (
            <div className="handwriting-sticky__checklist-item" key={item.id}>
              <button
                type="button"
                className={item.done ? "is-done" : undefined}
                aria-label={item.done ? "Marcar como pendente" : "Marcar como concluído"}
                aria-pressed={item.done}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  onRemember();
                  onUpdateChecklistItem(item.id, { done: !item.done });
                }}
              >
                {item.done ? "✓" : ""}
              </button>
              <input
                aria-label="Item do checklist"
                value={item.text}
                maxLength={120}
                onChange={(event) => onUpdateChecklistItem(item.id, { text: event.target.value })}
                placeholder="Próximo passo"
              />
              <button
                type="button"
                aria-label="Remover item"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onRemoveChecklistItem(item.id)}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="handwriting-sticky__add-item"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onAddChecklistItem()}
          >
            + Item
          </button>
        </div>
      ) : (
        <textarea
          aria-label={sticky.kind === "text" ? "Texto na folha" : "Texto do post-it"}
          value={sticky.text}
          maxLength={240}
          onFocus={() => onRemember()}
          onBlur={() => {
            if (!textAutoCorrect) return;
            const corrected = reviewPortugueseText(sticky.text);
            if (corrected !== sticky.text) onUpdate({ text: corrected });
          }}
          onChange={(event) => onUpdate({ text: event.target.value })}
          placeholder="Sua ideia aqui"
        />
      )}
      <button
        type="button"
        className="handwriting-sticky__resize"
        aria-label="Redimensionar post-it"
        title="Arraste o canto para redimensionar"
        onPointerDown={(event) => onResizeStart(event, sticky)}
        onPointerMove={(event) => onResizeMove(event, sticky)}
        onPointerUp={() => {
          onResizeEnd();
        }}
        onPointerCancel={() => {
          onResizeEnd();
        }}
      >
        <PaperEditorIcon name="resize" />
      </button>
    </div>
  );
}
