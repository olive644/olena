export type MathSoundCue = "start" | "correct" | "wrong" | "timeout" | "finish" | "xp";
const NOTES: Record<MathSoundCue, number[]> = {
  start: [392, 523, 659],
  correct: [659, 988, 1319],
  wrong: [392, 294, 196],
  timeout: [440, 330, 220],
  finish: [523, 659, 784, 1046],
  xp: [784, 1046, 1319],
};
/** Contexto exclusivo da partida, liberado pelo clique e fechado somente ao sair. */
export function createMathSound() {
  let context: AudioContext | undefined;
  let disposed = false;
  function unlock() {
    if (disposed || typeof AudioContext === "undefined") return;
    try {
      if (!context || context.state === "closed") context = new AudioContext();
      void context.resume().catch(() => {});
    } catch {
      /* O jogo continua disponível sem saída de áudio. */
    }
  }
  function play(cue: MathSoundCue | 1 | 2 | 3) {
    const active = context;
    if (!active || disposed || active.state === "closed") return;
    void active
      .resume()
      .then(() => {
        if (disposed || active.state !== "running" || document.hidden) return;
        const notes =
          typeof cue === "number" ? [cue === 3 ? 440 : cue === 2 ? 554 : 659] : NOTES[cue];
        notes.forEach((frequency, index) => {
          const start = active.currentTime + index * 0.09;
          const tone = active.createOscillator(),
            gain = active.createGain();
          tone.type = "triangle";
          tone.frequency.setValueAtTime(frequency, start);
          gain.gain.setValueAtTime(0.001, start);
          gain.gain.exponentialRampToValueAtTime(0.18, start + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
          tone.connect(gain);
          gain.connect(active.destination);
          tone.start(start);
          tone.stop(start + 0.25);
          tone.onended = () => {
            tone.disconnect();
            gain.disconnect();
          };
        });
      })
      .catch(() => {});
  }
  return {
    unlock,
    play,
    dispose() {
      disposed = true;
      if (context && context.state !== "closed") void context.close().catch(() => {});
    },
  };
}
