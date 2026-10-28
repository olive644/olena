import { areSoundEffectsEnabled } from "./accessibility-preferences";

/** Sons de papel do caderno, sintetizados no aparelho (nenhum arquivo é baixado). */
export type NotebookSoundCue =
  "turn" | "riffle" | "cover" | "clasp" | "enter" | "exit" | "tab" | "page";

type Layer = {
  frequency: number;
  q: number;
  duration: number;
  level: number;
  delay: number;
  sweep?: number;
};
// Cada efeito mistura ruído filtrado: o "chiado" da folha e um baque grave para capa e fecho.
const CUES: Record<NotebookSoundCue, Layer[]> = {
  turn: [
    { frequency: 2600, q: 0.8, duration: 0.32, level: 0.22, delay: 0, sweep: 0.55 },
    { frequency: 900, q: 1.2, duration: 0.14, level: 0.1, delay: 0.26 },
  ],
  riffle: [{ frequency: 3200, q: 0.9, duration: 0.12, level: 0.12, delay: 0, sweep: 0.7 }],
  cover: [
    { frequency: 1400, q: 0.7, duration: 0.42, level: 0.18, delay: 0, sweep: 0.5 },
    { frequency: 180, q: 1.4, duration: 0.22, level: 0.34, delay: 0.38 },
  ],
  clasp: [
    { frequency: 2400, q: 6, duration: 0.05, level: 0.2, delay: 0 },
    { frequency: 420, q: 3, duration: 0.08, level: 0.16, delay: 0.04 },
  ],
  enter: [{ frequency: 1800, q: 0.6, duration: 0.45, level: 0.16, delay: 0, sweep: 1.6 }],
  exit: [{ frequency: 2200, q: 0.6, duration: 0.4, level: 0.13, delay: 0, sweep: 0.45 }],
  tab: [{ frequency: 3000, q: 4, duration: 0.06, level: 0.16, delay: 0 }],
  page: [
    { frequency: 2800, q: 0.8, duration: 0.2, level: 0.14, delay: 0, sweep: 0.8 },
    { frequency: 3600, q: 5, duration: 0.05, level: 0.12, delay: 0.18 },
  ],
};

export function createNotebookSound() {
  let context: AudioContext | undefined;
  let noise: AudioBuffer | undefined;
  let disposed = false;
  let lastRiffle = Number.NEGATIVE_INFINITY;
  function unlock() {
    if (disposed || !areSoundEffectsEnabled()) return;
    const Constructor =
      globalThis.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return;
    try {
      if (!context || context.state === "closed") context = new Constructor();
      if (context.state === "suspended") void context.resume().catch(() => undefined);
    } catch {
      context = undefined;
    }
  }
  function buffer(audio: AudioContext) {
    if (!noise) {
      noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.5), audio.sampleRate);
      const data = noise.getChannelData(0);
      for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
    }
    return noise;
  }
  function play(cue: NotebookSoundCue) {
    const audio = context;
    if (disposed || !audio || audio.state !== "running" || !areSoundEffectsEnabled()) return false;
    if (typeof document !== "undefined" && document.hidden) return false;
    if (cue === "riffle") {
      // Folhear várias folhas não vira um ruído contínuo: um estalo a cada 60 ms no máximo.
      if (audio.currentTime - lastRiffle < 0.06) return false;
      lastRiffle = audio.currentTime;
    }
    for (const layer of CUES[cue]) {
      const start = audio.currentTime + layer.delay;
      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      source.buffer = buffer(audio);
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(layer.frequency, start);
      if (layer.sweep)
        filter.frequency.exponentialRampToValueAtTime(
          layer.frequency * layer.sweep,
          start + layer.duration,
        );
      filter.Q.value = layer.q;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        layer.level,
        start + Math.min(0.03, layer.duration / 3),
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + layer.duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audio.destination);
      source.start(start, Math.random() * 0.2, layer.duration + 0.02);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    }
    return true;
  }
  function dispose() {
    disposed = true;
    const audio = context;
    context = undefined;
    if (audio && audio.state !== "closed") void audio.close().catch(() => undefined);
  }
  return { unlock, play, dispose };
}
