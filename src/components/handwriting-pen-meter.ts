// Medidor da caneta: números para separar "o aparelho entrega pouco" de "o app desenha devagar".
// Só mede e mostra; nada é enviado para fora do aparelho. Os números valem para o traço em
// andamento e ficam na tela depois de soltar a caneta, para dar tempo de tirar uma captura.

export const SLOW_FRAME_MS = 33;

export type PenMeterSnapshot = {
  /** Eventos de ponteiro por segundo e pontos (com os agrupados) por segundo. */
  eventsPerSecond: number;
  samplesPerSecond: number;
  /** Quanto o evento esperou na fila até o app tratá-lo (agora menos o carimbo do navegador). */
  deliveryAverage: number;
  deliveryMax: number;
  /** Maior intervalo entre dois eventos seguidos. */
  inputGapMax: number;
  frames: number;
  frameMedian: number;
  frameP95: number;
  frameMax: number;
  slowFrames: number;
  /** Tempo gasto no código de desenho da camada ao vivo (não inclui a GPU). */
  paintAverage: number;
  paintMax: number;
  durationSeconds: number;
};

export type PenMeter = {
  /** Começa um traço novo e zera os números. */
  begin: (now: number) => void;
  /** Um evento de ponteiro: carimbo do navegador, quantos pontos trouxe e o relógio de agora. */
  recordEvent: (timeStamp: number, samples: number, now: number) => void;
  recordFrame: (now: number) => void;
  recordPaint: (milliseconds: number) => void;
  /** Fecha o traço; os números ficam disponíveis. */
  end: (now: number) => void;
  snapshot: (now: number) => PenMeterSnapshot | null;
};

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]!;
}

export function createPenMeter(): PenMeter {
  let startedAt: number | null = null;
  let endedAt: number | null = null;
  let events = 0;
  let samples = 0;
  let delivery: number[] = [];
  let lastEventAt: number | null = null;
  let inputGapMax = 0;
  let frameTimes: number[] = [];
  let lastFrameAt: number | null = null;
  let paints: number[] = [];

  function reset(now: number) {
    startedAt = now;
    endedAt = null;
    events = 0;
    samples = 0;
    delivery = [];
    lastEventAt = null;
    inputGapMax = 0;
    frameTimes = [];
    lastFrameAt = null;
    paints = [];
  }

  return {
    begin: reset,
    recordEvent(timeStamp, count, now) {
      if (startedAt === null || endedAt !== null) return;
      events += 1;
      samples += count;
      delivery.push(Math.max(0, now - timeStamp));
      if (lastEventAt !== null) inputGapMax = Math.max(inputGapMax, timeStamp - lastEventAt);
      lastEventAt = timeStamp;
    },
    recordFrame(now) {
      if (startedAt === null || endedAt !== null) return;
      if (lastFrameAt !== null) frameTimes.push(now - lastFrameAt);
      lastFrameAt = now;
    },
    recordPaint(milliseconds) {
      if (startedAt === null || endedAt !== null) return;
      paints.push(milliseconds);
    },
    end(now) {
      if (startedAt !== null && endedAt === null) endedAt = now;
    },
    snapshot(now) {
      if (startedAt === null) return null;
      const duration = Math.max(0.001, ((endedAt ?? now) - startedAt) / 1000);
      const sortedFrames = [...frameTimes].sort((a, b) => a - b);
      const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
      return {
        eventsPerSecond: events / duration,
        samplesPerSecond: samples / duration,
        deliveryAverage: delivery.length ? sum(delivery) / delivery.length : 0,
        deliveryMax: delivery.length ? Math.max(...delivery) : 0,
        inputGapMax,
        frames: frameTimes.length,
        frameMedian: percentile(sortedFrames, 0.5),
        frameP95: percentile(sortedFrames, 0.95),
        frameMax: sortedFrames.at(-1) ?? 0,
        slowFrames: frameTimes.filter((value) => value > SLOW_FRAME_MS).length,
        paintAverage: paints.length ? sum(paints) / paints.length : 0,
        paintMax: paints.length ? Math.max(...paints) : 0,
        durationSeconds: duration,
      };
    },
  };
}
