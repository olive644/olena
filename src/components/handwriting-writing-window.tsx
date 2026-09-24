import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

type HandwritingWritingWindowProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  status: string;
  autoFollow: boolean;
  onAutoFollowChange: (enabled: boolean) => void;
  onStart: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onFinish: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onBack: () => void;
  onAdvance: () => void;
  onNextLine: () => void;
};

export function HandwritingWritingWindow({
  canvasRef,
  status,
  autoFollow,
  onAutoFollowChange,
  onStart,
  onMove,
  onFinish,
  onBack,
  onAdvance,
  onNextLine,
}: HandwritingWritingWindowProps) {
  return (
    <section className="handwriting-writing-window" aria-label="Janela de escrita ampliada">
      <div>
        <strong>Escrita ampliada</strong>
        <span>Escreva aqui. Ao chegar à borda, a janela avança pela folha.</span>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={220}
        aria-label="Área ampliada para escrever com dedo ou caneta"
        onPointerDown={onStart}
        onPointerMove={onMove}
        onPointerUp={onFinish}
        onPointerCancel={onFinish}
      />
      <p className="handwriting-writing-window__status" aria-live="polite">
        {status}
      </p>
      <div className="handwriting-writing-window__actions">
        <label>
          <input
            type="checkbox"
            checked={autoFollow}
            onChange={(event) => onAutoFollowChange(event.target.checked)}
          />
          Acompanhar escrita
        </label>
        <button type="button" onClick={onBack}>
          Voltar
        </button>
        <button type="button" onClick={onAdvance}>
          Avançar
        </button>
        <button type="button" onClick={onNextLine}>
          Próxima linha
        </button>
      </div>
    </section>
  );
}
