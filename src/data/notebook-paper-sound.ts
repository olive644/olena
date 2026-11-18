import { areSoundEffectsEnabled } from "./accessibility-preferences";

// Sons do "segurar para trocar o caderno inteiro": uma subida enquanto a pessoa segura e um
// acorde curto ao concluir. Sintetizados na hora, sem arquivos; mudos com os efeitos desligados.
let context: AudioContext | undefined;

function audio(): AudioContext | undefined {
  if (!areSoundEffectsEnabled() || typeof AudioContext === "undefined") return undefined;
  try {
    if (!context || context.state === "closed") context = new AudioContext();
    if (context.state === "suspended") void context.resume();
    return context.state === "closed" ? undefined : context;
  } catch {
    return undefined;
  }
}

/** Começa a subida do carregamento; devolve a função que a interrompe. */
export function startPaperHoldSound(durationMs: number): () => void {
  const ctx = audio();
  if (!ctx) return () => undefined;
  try {
    const now = ctx.currentTime;
    const seconds = durationMs / 1000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.08);
    gain.connect(ctx.destination);
    const tone = ctx.createOscillator();
    tone.type = "triangle";
    tone.frequency.setValueAtTime(220, now);
    tone.frequency.exponentialRampToValueAtTime(660, now + seconds);
    tone.connect(gain);
    tone.start(now);
    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      const end = ctx.currentTime;
      gain.gain.cancelScheduledValues(end);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), end);
      gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.06);
      tone.stop(end + 0.08);
    };
  } catch {
    return () => undefined;
  }
}

/** Acorde de conclusão: folhas viradas e um brilho no fim. */
export function playPaperAppliedSound(): void {
  const ctx = audio();
  if (!ctx) return;
  try {
    [523.25, 659.25, 783.99, 1318.5].forEach((frequency, index) => {
      const start = ctx.currentTime + index * 0.07;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.05, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      const tone = ctx.createOscillator();
      tone.type = index === 3 ? "sine" : "triangle";
      tone.frequency.value = frequency;
      tone.connect(gain);
      tone.start(start);
      tone.stop(start + 0.42);
    });
  } catch {
    // Sem dispositivo de áudio, o efeito visual continua.
  }
}
