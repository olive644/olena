import { useEffect, useRef } from "react";
import type { ShapeKind } from "./handwriting-shapes";
import { PaperObjectIcon } from "./paper-object-icon";
import { PaperEditorIcon } from "./paper-editor-icon";

export type InsertKind = ShapeKind | "ruler" | "coordinate-system";

type HandwritingShapeInsertProps = {
  onInsert: (kind: InsertKind) => void;
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

const MEASURING: { kind: "ruler" | "coordinate-system"; label: string }[] = [
  { kind: "ruler", label: "Régua" },
  { kind: "coordinate-system", label: "Eixos de coordenadas" },
];

// Alternativa por teclado ao desenho e à medição com ponteiro.
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
      aria-label="Inserir sem desenhar"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header>
        <h2>Inserir sem desenhar</h2>
        <button type="button" aria-label="Fechar" onClick={onClose}>
          <PaperEditorIcon name="close" />
        </button>
      </header>
      <p>Escolha uma forma, régua ou eixos. O objeto aparece pronto para mover e ajustar.</p>
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
      <div className="handwriting-shape-insert__grid" role="group" aria-label="Régua e eixos">
        {MEASURING.map(({ kind, label }) => (
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
