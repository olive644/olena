export type NaturalVoiceStatus = "idle" | "generating" | "playing" | "ready" | "error";

export type NaturalVoiceState = {
  status: NaturalVoiceStatus;
  message?: string;
};

type CachedAudio = { blob: Blob; provider: string | undefined };

class AudioPlaybackBlockedError extends Error {}

export class NaturalVoicePlayer {
  private audio: HTMLAudioElement | undefined;
  private audioUrl: string | undefined;
  private readonly controllers = new Set<AbortController>();
  private requestId = 0;
  private readonly cache = new Map<string, Promise<CachedAudio>>();

  // `isAllowed` diz se a pessoa aceitou enviar o texto das frases a uma empresa parceira
  // de voz. Sem aceite (o padrão) nada sai do aparelho: o Quiz pode usar a voz
  // do dispositivo, mas a Sala não substitui a gravação compartilhada.
  constructor(
    private readonly onState: (state: NaturalVoiceState) => void,
    private readonly isAllowed: () => boolean = () => false,
    private readonly roomCode: () => string | undefined = () => undefined,
  ) {}

  preload(text: string, rate: number): void {
    if (!this.isAllowed()) return;
    void this.load(text, rate).catch(() => undefined);
  }

  async generate(text: string, rate: number, fallback?: () => void): Promise<boolean> {
    this.stopPlayback();
    if (!this.isAllowed()) {
      this.onState(
        fallback
          ? { status: "idle" }
          : { status: "error", message: "Ative a voz natural para ouvir esta pergunta." },
      );
      fallback?.();
      return false;
    }
    const requestId = this.requestId;
    this.onState({ status: "generating", message: "Preparando a pronúncia." });

    try {
      const { blob, provider } = await this.load(text, rate);
      if (requestId !== this.requestId) return false;
      if (provider && provider !== "kokoro") {
        this.onState({ status: "generating", message: "Usando voz alternativa." });
      }
      await this.playBlob(blob, requestId);
      return true;
    } catch (error) {
      if (requestId !== this.requestId) return false;
      this.onState({
        status: "error",
        message: fallback
          ? "Usando a voz do dispositivo."
          : error instanceof AudioPlaybackBlockedError
            ? "O navegador bloqueou o início automático. Toque para ouvir."
            : "Áudio indisponível. Toque para tentar novamente.",
      });
      fallback?.();
      return false;
    }
  }

  stop(): void {
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
    this.cache.clear();
    this.stopPlayback();
  }

  private stopPlayback(): void {
    this.audio?.pause();
    this.audio = undefined;
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
    this.audioUrl = undefined;
    this.requestId += 1;
  }

  dispose(): void {
    this.stop();
  }

  private load(text: string, rate: number): Promise<CachedAudio> {
    const roomCode = this.roomCode();
    const cacheKey = `${roomCode ?? "individual"}:${rate}:${text}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const request = (async () => {
      const controller = new AbortController();
      this.controllers.add(controller);
      const timeout = window.setTimeout(() => controller.abort(), 20_000);
      try {
        const response = await fetch("/api/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, rate, consent: true, ...(roomCode ? { roomCode } : {}) }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Natural speech unavailable");
        const provider = response.headers.get("X-TTS-Provider") ?? undefined;
        return { blob: await response.blob(), provider };
      } finally {
        window.clearTimeout(timeout);
        this.controllers.delete(controller);
      }
    })();
    this.cache.set(cacheKey, request);
    void request.catch(() => {
      if (this.cache.get(cacheKey) === request) this.cache.delete(cacheKey);
    });
    return request;
  }

  private async playBlob(blob: Blob, requestId: number): Promise<void> {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.addEventListener(
      "ended",
      () => {
        URL.revokeObjectURL(audioUrl);
        if (requestId === this.requestId) this.onState({ status: "ready" });
      },
      { once: true },
    );
    this.audioUrl = audioUrl;
    this.audio = audio;
    this.onState({ status: "playing" });
    try {
      await audio.play();
    } catch {
      URL.revokeObjectURL(audioUrl);
      if (this.audioUrl === audioUrl) this.audioUrl = undefined;
      if (this.audio === audio) this.audio = undefined;
      throw new AudioPlaybackBlockedError("Browser blocked audio playback");
    }
  }
}
