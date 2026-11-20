import { areSoundEffectsEnabled } from "./accessibility-preferences";

/**
 * Som dos créditos da Olena sendo gastos: moedinhas descendo, mais ticks quanto mais se gasta.
 * O contexto de áudio vem de `prepareRoomFeedbackSound`, criado no clique de gerar, porque o
 * navegador só libera som depois de um gesto. Sem contexto ou com sons desligados, fica mudo.
 */
export function playCreditSpendSound(context: AudioContext | undefined, spent: number): void {
  if (!areSoundEffectsEnabled()) return;
  if (!context || context.state === "closed") return;
  void context
    .resume()
    .then(() => {
      if (!areSoundEffectsEnabled()) return;
      const ticks = Math.min(6, Math.max(2, Math.round(spent / 12)));
      for (let index = 0; index < ticks; index += 1) {
        const start = context.currentTime + index * 0.07;
        const gain = context.createGain();
        gain.connect(context.destination);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.05, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
        const tone = context.createOscillator();
        tone.type = "triangle";
        tone.frequency.setValueAtTime(1568 - index * 90, start);
        tone.frequency.exponentialRampToValueAtTime(1175 - index * 70, start + 0.12);
        tone.connect(gain);
        tone.start(start);
        tone.stop(start + 0.17);
      }
      // Fecho: um tom grave curto, como a moeda caindo no cofre.
      const end = context.currentTime + ticks * 0.07 + 0.04;
      const gain = context.createGain();
      gain.connect(context.destination);
      gain.gain.setValueAtTime(0.001, end);
      gain.gain.exponentialRampToValueAtTime(0.06, end + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, end + 0.28);
      const low = context.createOscillator();
      low.type = "sine";
      low.frequency.setValueAtTime(392, end);
      low.frequency.exponentialRampToValueAtTime(196, end + 0.25);
      low.connect(gain);
      low.start(end);
      low.stop(end + 0.3);
    })
    .catch(() => {
      // sem dispositivo de áudio: o medidor funciona do mesmo jeito
    });
}
