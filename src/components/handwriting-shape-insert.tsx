import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import { useEffect, useRef } from "react";
import type { ShapeKind } from "./handwriting-shapes";
import { PaperObjectIcon } from "./paper-object-icon";
import { PaperEditorIcon } from "./paper-editor-icon";

export type InsertKind = Exclude<ShapeKind, "line">;

type HandwritingShapeInsertProps = {
  onInsert: (kind: InsertKind) => void;
  onClose: () => void;
};

const SHAPES: { kind: InsertKind; label: string }[] = localizeLabels(() => [
  { kind: "ellipse", label: uiText(1665) },
  { kind: "rectangle", label: uiText(197) },
  { kind: "triangle", label: uiText(227) },
  { kind: "arrow", label: uiText(1666) },
  { kind: "polygon", label: uiText(228) },
]);

// Alternativa por teclado ao desenho e à medição com ponteiro.
export function HandwritingShapeInsert({ onInsert, onClose }: HandwritingShapeInsertProps) {
  useLanguage();

  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="handwriting-shape-insert"
      aria-label={uiText(229)}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header>
        <h2>{uiText(229)}</h2>
        <button type="button" aria-label={uiText(230)} onClick={onClose}>
          <PaperEditorIcon name="close" />
        </button>
      </header>
      <p>{uiText(231)}</p>
      <div className="handwriting-shape-insert__grid" role="group" aria-label={uiText(232)}>
        {SHAPES.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            onClick={() => {
              onInsert(kind);
              onClose();
            }}
          >
            <PaperObjectIcon name={kind} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </dialog>
  );
}
