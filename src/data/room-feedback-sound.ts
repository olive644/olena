// Efeitos locais curtos, sem arquivos externos nem acesso ao microfone.
export function prepareRoomFeedbackSound(): AudioContext | undefined {
  if (typeof AudioContext === "undefined") return;
  try {
    const context = new AudioContext();
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
        void context.close();
      };
    })
    .catch(() => {
      void context.close();
    });
}
