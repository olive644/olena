import { useCallback, useEffect, useRef } from "react";
import { createPenMeter } from "./handwriting-pen-meter";

// Liga o medidor ao editor: o editor chama begin/record/end nos eventos da caneta e o painel mostra
// os números. Com o medidor desligado nada disso roda.
export function useHandwritingPenMeter(enabled: boolean) {
  const meter = useRef(createPenMeter());
  const frame = useRef<number | null>(null);

  const stopFrames = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const begin = useCallback(() => {
    if (!enabled) return;
    stopFrames();
    meter.current.begin(performance.now());
    const tick = (now: number) => {
      meter.current.recordFrame(now);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [enabled, stopFrames]);

  const recordEvent = useCallback(
    (timeStamp: number, samples: number) => {
      if (enabled) meter.current.recordEvent(timeStamp, samples, performance.now());
    },
    [enabled],
  );

  const recordPaint = useCallback(
    (startedAt: number) => {
      if (enabled) meter.current.recordPaint(performance.now() - startedAt);
    },
    [enabled],
  );

  const end = useCallback(() => {
    stopFrames();
    if (enabled) meter.current.end(performance.now());
  }, [enabled, stopFrames]);

  useEffect(() => stopFrames, [stopFrames]);

  return { meter, begin, recordEvent, recordPaint, end };
}
