// Efeitos locais curtos, sem arquivos externos nem acesso ao microfone.
let victoryContext: AudioContext | undefined;
let victoryExpiry: ReturnType<typeof setTimeout> | undefined;

export function playRoomVictorySound(): void {
  if (typeof AudioContext === "undefined") return;
  try {
    const context =
      victoryContext?.state === "closed"
        ? new AudioContext()
        : (victoryContext ?? new AudioContext());
    victoryContext = undefined;
    clearTimeout(victoryExpiry);
    // Sem desbloqueio automático: navegadores que exigem gesto ficam em silêncio.
    if (context.state !== "running") {
      void context.close();
      return;
    }
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      const start = context.currentTime + index * 0.09;
      const gain = context.createGain();
      gain.connect(context.destination);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.045, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      const tone = context.createOscillator();
      tone.type = "sine";
      tone.frequency.value = frequency;
      tone.connect(gain);
      tone.start(start);
      tone.stop(start + 0.36);
      if (index === 3)
        tone.onended = () => {
          void context.close();
        };
    });
  } catch {
    // O resultado continua funcionando sem dispositivo de áudio.
  }
}

export function prepareRoomFeedbackSound(): AudioContext | undefined {
  if (typeof AudioContext === "undefined") return;
  try {
    const context =
      victoryContext?.state === "closed"
        ? new AudioContext()
        : (victoryContext ?? new AudioContext());
    victoryContext = context;
    clearTimeout(victoryExpiry);
    victoryExpiry = setTimeout(() => {
      victoryContext = undefined;
      if (context.state !== "closed") void context.close();
    }, 180_000);
    void context.resume().catch(() => context.close());
    return context;
  } catch {
    return;
  }
}

export function playRoomFeedbackSound(correct: boolean, context: AudioContext | undefined): void {
  if (!context || context.state === "closed") return;
  void context
    .resume()
    .then(() => {
      const gain = context.createGain();
      gain.connect(context.destination);
      gain.gain.setValueAtTime(0.06, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.32);
      const tone = context.createOscillator();
      tone.type = correct ? "triangle" : "sine";
      tone.frequency.setValueAtTime(correct ? 880 : 220, context.currentTime);
      tone.frequency.exponentialRampToValueAtTime(correct ? 1320 : 110, context.currentTime + 0.2);
      tone.connect(gain);
      tone.start();
      tone.stop(context.currentTime + 0.32);
      if (correct) {
        const buffer = context.createBuffer(
          1,
          Math.floor(context.sampleRate * 0.12),
          context.sampleRate,
        );
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++)
          samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
        const pop = context.createBufferSource();
        pop.buffer = buffer;
        pop.connect(gain);
        pop.start();
      }
      tone.onended = () => {
        tone.disconnect();
        gain.disconnect();
        if (context !== victoryContext && context.state !== "closed") void context.close();
      };
    })
    .catch(() => {
      void context.close();
    });
}
