import { useEffect, useRef } from "react";
import type { ShapeKind } from "./handwriting-shapes";
import { PaperObjectIcon } from "./paper-object-icon";
import { PaperEditorIcon } from "./paper-editor-icon";

type HandwritingShapeInsertProps = {
  onInsert: (kind: ShapeKind) => void;
  onClose: () => void;
};

const SHAPES: { kind: ShapeKind; label: string }[] = [
  { kind: "line", label: "Reta" },
  { kind: "ellipse", label: "Elipse" },
  { kind: "rectangle", label: "Retângulo" },
  { kind: "triangle", label: "Triângulo" },
  { kind: "arrow", label: "Seta" },
  { kind: "polygon", label: "Polígono" },
];

// A escolha por teclado insere uma forma pronta para mover, girar e redimensionar.
export function HandwritingShapeInsert({ onInsert, onClose }: HandwritingShapeInsertProps) {
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
      aria-label="Inserir forma"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header>
        <h2>Inserir forma</h2>
        <button type="button" aria-label="Fechar" onClick={onClose}>
          <PaperEditorIcon name="close" />
        </button>
      </header>
      <p>Escolha uma forma. Ela aparece na área visível, pronta para mover e ajustar.</p>
      <div className="handwriting-shape-insert__grid" role="group" aria-label="Formas">
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
