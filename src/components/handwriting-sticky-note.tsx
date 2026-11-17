import { HandwritingTableControls } from "./handwriting-table-controls";
import { NotebookFormulaPreview } from "./notebook-formula-preview";
import { PaperCloseGlyph } from "./paper-close-icon";
import { uiText, useLanguage } from "../i18n/runtime";
import { reviewPortugueseText } from "../domain/text-review";
import { PaperCheckIcon } from "./paper-check-icon";
import type { HandwritingSticky } from "../domain/handwriting";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { stickyHeight, stickyWidth, tableSetCell } from "./handwriting-geometry";
import { PAGE_HEIGHT as DEFAULT_HEIGHT, PAGE_WIDTH as DEFAULT_WIDTH } from "./handwriting-types";
import { PaperEditorIcon } from "./paper-editor-icon";

type StickyColor = HandwritingSticky["color"];

type HandwritingStickyNoteProps = {
  sticky: HandwritingSticky;
  pageWidth?: number;
  pageHeight?: number;
  isSelected: boolean;
  ignorePointer: boolean;
  menuOpen: boolean;
  editingText?: boolean;
  selectionManaged?: boolean;
  onEditText?: () => void;
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
  onToggleChecklist: () => void;
  onChangeColor: (color: StickyColor) => void;
  onRemove: () => void;
  onUpdateChecklistItem: (itemId: string, change: { text?: string; done?: boolean }) => void;
  onRemoveChecklistItem: (itemId: string) => void;
  onAddChecklistItem: () => void;
};

export function HandwritingStickyNote({
  sticky,
  pageWidth: PAGE_WIDTH = DEFAULT_WIDTH,
  pageHeight: PAGE_HEIGHT = DEFAULT_HEIGHT,
  isSelected,
  ignorePointer,
  menuOpen,
  editingText,
  selectionManaged = false,
  onEditText,
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
  onToggleChecklist,
  onChangeColor,
  onRemove,
  onUpdateChecklistItem,
  onRemoveChecklistItem,
  onAddChecklistItem,
}: HandwritingStickyNoteProps) {
  useLanguage();

  return (
    <div
      className={`handwriting-sticky handwriting-sticky--${sticky.kind === "text" ? "text" : sticky.kind === "table" ? "table" : sticky.color}${sticky.formula ? " handwriting-sticky--formula" : ""}${isSelected ? " is-selected" : ""}`}
      style={{
        pointerEvents: ignorePointer ? "none" : "auto",
        left: `${(sticky.x / PAGE_WIDTH) * 100}%`,
        top: `${(sticky.y / PAGE_HEIGHT) * 100}%`,
        width: `${(stickyWidth(sticky) / PAGE_WIDTH) * 100}%`,
        height: `${(stickyHeight(sticky) / PAGE_HEIGHT) * 100}%`,
        ...(sticky.kind === "table"
          ? ({
              "--table-unit": `calc(var(--handwriting-page-width, 1200px) / ${PAGE_WIDTH})`,
            } as CSSProperties)
          : {}),
        ...(sticky.kind === "text" ? { color: sticky.ink ?? "#17151c" } : {}),
      }}
      data-sticky-color={sticky.color}
      data-sticky-id={sticky.id}
      data-selection-managed={selectionManaged || undefined}
      key={sticky.id}
    >
      <div
        className="handwriting-sticky__bar"
        onPointerDown={(event) => {
          if (
            selectionManaged ||
            !(event.target instanceof Element) ||
            event.target.closest("button")
          )
            return;
          onDragStart(event, sticky);
        }}
        onPointerMove={(event) => onDragMove(event, sticky)}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onLostPointerCapture={onDragEnd}
      >
        <span
          className="handwriting-sticky__drag-hint"
          role={selectionManaged ? undefined : "button"}
          tabIndex={selectionManaged ? undefined : 0}
          aria-label={
            selectionManaged
              ? undefined
              : sticky.kind === "text"
                ? uiText(1685)
                : sticky.kind === "table"
                  ? uiText(1686)
                  : uiText(1687)
          }
          onKeyDown={(event) => {
            if (selectionManaged) return;
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
        >
          {sticky.formula
            ? uiText(267)
            : sticky.kind === "text"
              ? uiText(361)
              : sticky.kind === "table"
                ? uiText(366)
                : sticky.checklist?.length
                  ? uiText(1688)
                  : uiText(1689)}
        </span>
        {!selectionManaged && (
          <button
            type="button"
            className="handwriting-sticky__menu-trigger"
            aria-label={uiText(268)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onToggleMenu}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path
                fill="#7433e0"
                d="m2 10 2-2 3 3-2 3-3-1Zm8 0 2-2 3 3-2 3-3-1Zm8 0 2-2 3 3-2 3-3-1Z"
              />
            </svg>
          </button>
        )}
      </div>
      {!selectionManaged && (
        <div
          className="handwriting-sticky__menu"
          data-open={menuOpen}
          inert={!menuOpen}
          aria-hidden={!menuOpen}
          role="menu"
          aria-label={uiText(268)}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {sticky.kind === undefined && (
            <button
              type="button"
              className={sticky.checklist?.length ? "is-active" : undefined}
              aria-pressed={Boolean(sticky.checklist?.length)}
              onClick={onToggleChecklist}
            >
              <PaperEditorIcon name="review" />
              {sticky.checklist?.length ? uiText(269) : uiText(1688)}
            </button>
          )}
          {sticky.kind !== "text" && (
            <div className="handwriting-sticky__menu-group">
              <button type="button" aria-expanded={colorMenuOpen} onClick={onToggleColorMenu}>
                <PaperEditorIcon name="sticky" /> {uiText(270)}
              </button>
              {colorMenuOpen && (
                <div className="handwriting-sticky__menu-colors" aria-label={uiText(271)}>
                  {(["yellow", "blue", "lilac"] as const).map((nextColor) => (
                    <button
                      key={nextColor}
                      type="button"
                      className={sticky.color === nextColor ? "is-active" : ""}
                      aria-label={uiText(1691, [
                        nextColor === "yellow"
                          ? "amarela"
                          : nextColor === "blue"
                            ? "azul"
                            : uiText(1690),
                      ])}
                      onClick={() => onChangeColor(nextColor)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          <button type="button" className="handwriting-sticky__menu-danger" onClick={onRemove}>
            <PaperCloseGlyph /> {uiText(44)}
          </button>
        </div>
      )}
      {sticky.kind === "table" ? (
        <div className="handwriting-sticky__table">
          <div className="handwriting-sticky__table-grid">
            <table>
              <tbody
                style={
                  selectionManaged
                    ? { gridTemplateRows: `repeat(${sticky.cells?.length ?? 1}, minmax(0, 1fr))` }
                    : undefined
                }
              >
                {(sticky.cells ?? [[""]]).map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    style={
                      selectionManaged
                        ? { gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }
                        : undefined
                    }
                  >
                    {row.map((cell, columnIndex) => (
                      <td key={columnIndex}>
                        <textarea
                          aria-label={uiText(1692, [rowIndex + 1, columnIndex + 1])}
                          value={cell}
                          maxLength={200}
                          onFocus={() => {
                            if (!onEditText || editingText) onRemember();
                          }}
                          onChange={(event) =>
                            onUpdate({
                              cells: tableSetCell(
                                sticky.cells ?? [[""]],
                                rowIndex,
                                columnIndex,
                                event.target.value,
                              ),
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!selectionManaged && (
            <HandwritingTableControls
              cells={sticky.cells ?? [[""]]}
              onRemember={onRemember}
              onChange={(cells) => onUpdate({ cells })}
            />
          )}
        </div>
      ) : sticky.checklist?.length ? (
        <div className="handwriting-sticky__checklist">
          <input
            aria-label={uiText(283)}
            value={sticky.text}
            maxLength={80}
            onFocus={() => onRemember()}
            onChange={(event) => onUpdate({ text: event.target.value })}
            placeholder={uiText(284)}
          />
          {sticky.checklist.map((item) => (
            <div className="handwriting-sticky__checklist-item" key={item.id}>
              <button
                type="button"
                className={item.done ? "is-done" : undefined}
                aria-label={item.done ? uiText(1693) : uiText(285)}
                aria-pressed={item.done}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  onRemember();
                  onUpdateChecklistItem(item.id, { done: !item.done });
                }}
              >
                {item.done ? <PaperCheckIcon size={15} /> : null}
              </button>
              <input
                aria-label={uiText(286)}
                value={item.text}
                maxLength={120}
                onChange={(event) => onUpdateChecklistItem(item.id, { text: event.target.value })}
                placeholder={uiText(287)}
              />
              <button
                type="button"
                aria-label={uiText(288)}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onRemoveChecklistItem(item.id)}
              >
                <PaperCloseGlyph size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="handwriting-sticky__add-item"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onAddChecklistItem()}
          >
            {uiText(290)}
          </button>
        </div>
      ) : (
        <textarea
          aria-label={
            sticky.formula ? uiText(223) : sticky.kind === "text" ? uiText(1694) : uiText(1695)
          }
          style={{
            fontSize:
              "calc(var(--handwriting-page-width, 1200px) * " +
              (sticky.textSize ?? 25) +
              " / " +
              PAGE_WIDTH +
              ")",
            lineHeight: 1.3,
            color: sticky.ink,
          }}
          readOnly={Boolean(onEditText) && !editingText}
          onClick={onEditText}
          spellCheck={!sticky.formula}
          value={sticky.text}
          maxLength={240}
          onFocus={() => onRemember()}
          onBlur={() => {
            if ((onEditText && !editingText) || sticky.formula || !textAutoCorrect) return;
            const corrected = reviewPortugueseText(sticky.text);
            if (corrected !== sticky.text) onUpdate({ text: corrected });
          }}
          onChange={(event) => onUpdate({ text: event.target.value })}
          placeholder={uiText(291)}
        />
      )}
      {sticky.formula && <NotebookFormulaPreview source={sticky.text} />}
      {!selectionManaged && (
        <button
          type="button"
          className="handwriting-sticky__resize"
          aria-label={uiText(292)}
          title={uiText(293)}
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
      )}
    </div>
  );
}
