import { loadRoomRecording } from "./room-recording";
import type { NaturalVoiceState } from "./listening-audio";
import { readyListeningAudioUrl } from "../domain/ready-listening-words";

export class RecordedRoomPlayer {
  private cache = new Map<string, Promise<Blob>>();
  private audio: HTMLAudioElement | undefined;
  private url: string | undefined;
  private requestId = 0;
  private context: AudioContext | undefined;
  private source: AudioBufferSourceNode | undefined;

  unlock(): void {
    if (typeof AudioContext === "undefined") return;
    try {
      if (!this.context || this.context.state === "closed") this.context = new AudioContext();
      void this.context.resume().catch(() => undefined);
    } catch {
      // Reprodução manual continua disponível sem Web Audio.
    }
  }

  constructor(
    private readonly onState: (state: NaturalVoiceState) => void,
    private readonly room: () => { code: string; credential: string } | undefined,
  ) {}

  preload(questionIndex: number, readyAudioId?: string): void {
    void this.load(questionIndex, readyAudioId).catch(() => undefined);
  }

  async generate(questionIndex: number, readyAudioId?: string): Promise<boolean> {
    this.stopPlayback();
    const requestId = this.requestId;
    this.onState({
      status: "generating",
      message: readyAudioId ? "Carregando a palavra." : "Carregando a voz do professor.",
    });
    try {
      const blob = await this.load(questionIndex, readyAudioId);
      if (requestId !== this.requestId) return false;
      if (this.context?.state === "running") {
        const buffer = await this.context.decodeAudioData(await blob.arrayBuffer());
        if (requestId !== this.requestId) return false;
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.context.destination);
        this.source = source;
        source.onended = () => {
          source.disconnect();
          if (this.source !== source) return;
          this.source = undefined;
          this.onState({ status: "ready" });
        };
        this.onState({ status: "playing" });
        source.start();
        return true;
      }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.url = url;
      this.audio = audio;
      audio.addEventListener(
        "ended",
        () => {
          if (this.url === url) {
            URL.revokeObjectURL(url);
            this.url = undefined;
            this.audio = undefined;
            this.onState({ status: "ready" });
          }
        },
        { once: true },
      );
      this.onState({ status: "playing" });
      await audio.play();
      return true;
    } catch (error) {
      if (requestId === this.requestId)
        this.onState({
          status: "error",
          message:
            error instanceof DOMException && error.name === "NotAllowedError"
              ? "Toque em Ouvir novamente para iniciar a gravação."
              : error instanceof Error
                ? error.message
                : "Gravação indisponível.",
        });
      return false;
    }
  }

  stop(): void {
    this.stopPlayback();
    this.cache.clear();
  }

  dispose(): void {
    this.stop();
    if (this.context && this.context.state !== "closed") void this.context.close();
  }

  private stopPlayback(): void {
    this.requestId += 1;
    const source = this.source;
    this.source = undefined;
    if (source) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    this.audio?.pause();
    this.audio = undefined;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = undefined;
  }

  private load(questionIndex: number, readyAudioId?: string): Promise<Blob> {
    if (readyAudioId) {
      const url = readyListeningAudioUrl(readyAudioId);
      if (!url) return Promise.reject(new Error("Esta palavra pronta não está disponível."));
      const cached = this.cache.get(url);
      if (cached) return cached;
      const request = fetch(url).then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar o áudio da palavra.");
        return response.blob();
      });
      this.cache.set(url, request);
      void request.catch(() => {
        if (this.cache.get(url) === request) this.cache.delete(url);
      });
      return request;
    }
    const room = this.room();
    if (!room) return Promise.reject(new Error("A sala não está disponível."));
    const key = `${room.code}:${questionIndex}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const request = loadRoomRecording(room.code, room.credential, questionIndex);
    this.cache.set(key, request);
    void request.catch(() => {
      if (this.cache.get(key) === request) this.cache.delete(key);
    });
    return request;
  }
}
