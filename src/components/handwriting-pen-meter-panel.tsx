import { useEffect, useState, type RefObject } from "react";
import { uiText } from "../i18n/runtime";
import { SLOW_FRAME_MS, type PenMeter, type PenMeterSnapshot } from "./handwriting-pen-meter";

const one = (value: number) => value.toFixed(1);

export function HandwritingPenMeterPanel({
  meter,
  sheet,
}: {
  meter: RefObject<PenMeter>;
  sheet: RefObject<HTMLCanvasElement | null>;
}) {
  const [shot, setShot] = useState<PenMeterSnapshot | null>(null);
  const [layers, setLayers] = useState("");
  useEffect(() => {
    const timer = window.setInterval(() => {
      setShot(meter.current.snapshot(performance.now()));
      const canvas = sheet.current;
      if (canvas) {
        setLayers(
          uiText("Folha: {0} x {1} px, {2} camadas, tela {3}x", [
            canvas.width,
            canvas.height,
            canvas.parentElement?.querySelectorAll("canvas").length ?? 1,
            Number(window.devicePixelRatio.toFixed(2)),
          ]),
        );
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [meter, sheet]);
  return (
    <aside className="handwriting-pen-meter" aria-label={uiText("Medidor da caneta")}>
      <strong>{uiText("Medidor da caneta")}</strong>
      {shot ? (
        <>
          <span>
            {uiText("Entrada: {0} eventos/s, {1} pontos/s", [
              Math.round(shot.eventsPerSecond),
              Math.round(shot.samplesPerSecond),
            ])}
          </span>
          <span>
            {uiText("Fila da entrada: média {0} ms, pior {1} ms", [
              one(shot.deliveryAverage),
              one(shot.deliveryMax),
            ])}
          </span>
          <span>{uiText("Maior pausa sem entrada: {0} ms", [Math.round(shot.inputGapMax)])}</span>
          <span>
            {uiText("Quadros: mediana {0} ms, p95 {1} ms, pior {2} ms", [
              one(shot.frameMedian),
              one(shot.frameP95),
              one(shot.frameMax),
            ])}
          </span>
          <span data-slow={shot.slowFrames > 0 || undefined}>
            {uiText("Quadros lentos (mais de {0} ms): {1} de {2}", [
              SLOW_FRAME_MS,
              shot.slowFrames,
              shot.frames,
            ])}
          </span>
          <span>
            {uiText("Desenho ao vivo: média {0} ms, pior {1} ms", [
              one(shot.paintAverage),
              one(shot.paintMax),
            ])}
          </span>
        </>
      ) : (
        <span>{uiText("Escreva uma palavra para medir")}</span>
      )}
      {layers && <span>{layers}</span>}
    </aside>
  );
}
