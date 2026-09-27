import { useEffect, useRef } from "react";
import type { ShapeKind } from "./handwriting-shapes";

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

// Alternativa por teclado a desenhar a mão livre (segurar a caneta parada no fim do traço
// para uma forma, ou arrastar para medir com a régua e os eixos): nenhum dos dois tem
// como funcionar sem ponteiro, então aqui tudo entra pronto, do tamanho padrão, no meio da
// folha. Depois dá para mover, girar e redimensionar com o que já é acessível por teclado
// na seleção (setas, Girar, Aumentar/Diminuir).
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
          ×
        </button>
      </header>
      <p>Entra pronto no meio da folha. Mova, gire e redimensione com a seleção.</p>
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
            {label}
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
            {label}
          </button>
        ))}
      </div>
    </dialog>
  );
}
