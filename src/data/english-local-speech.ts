import { prepareSpeechAudio } from "./english-speech-audio";
export class LocalEnglishSpeech {
  private worker: Worker | undefined;
  private sequence = 0;
  private pending:
    | {
        id: number;
        resolve(value: string): void;
        reject(error: Error): void;
        timer: ReturnType<typeof setTimeout>;
      }
    | undefined;
  private stream: MediaStream | undefined;
  private source: MediaStreamAudioSourceNode | undefined;
  private capture: AudioWorkletNode | undefined;
  private gain: GainNode | undefined;
  private chunks: Float32Array[] = [];
  private samples = 0;
  private silence = 0;
  private voiced = false;
  private ended = false;
  private onSilence: () => void = () => undefined;
  private inference: Promise<string> | undefined;
  private captureId = 0;
  private context: AudioContext | undefined;
  ready = false;
  private onProgress: (percent: number) => void = () => undefined;
  subscribeProgress(listener: (percent: number) => void) {
    this.onProgress = listener;
    return () => {
      this.onProgress = () => undefined;
    };
  }
  subscribeSilence(listener: () => void) {
    this.onSilence = listener;
    return () => {
      this.onSilence = () => undefined;
    };
  }
  load() {
    if (this.ready) return Promise.resolve("");
    return this.send("load", 180000).then((value) => {
      this.ready = true;
      return value;
    });
  }
  private send(type: "load" | "transcribe", limit: number, audio?: Float32Array): Promise<string> {
    if (this.pending) return Promise.reject(new Error("busy"));
    if (!this.worker) {
      this.worker = new Worker(new URL("./english-asr.worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker.onmessage = (
        event: MessageEvent<{ id?: number; type: string; progress?: number; text?: string }>,
      ) => {
        if (event.data.type === "progress") {
          this.onProgress(Math.max(0, Math.min(100, Math.round(event.data.progress ?? 0))));
          return;
        }
        const pending = this.pending;
        if (!pending || pending.id !== event.data.id) return;
        clearTimeout(pending.timer);
        this.pending = undefined;
        if (event.data.type === "error") pending.reject(new Error("local-model"));
        else pending.resolve(event.data.text ?? "");
      };
      this.worker.onerror = () => this.dispose();
    }
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending = { id, resolve, reject, timer: setTimeout(() => this.dispose(), limit) };
      try {
        this.worker!.postMessage(
          { type, id, ...(audio ? { audio } : {}) },
          audio ? [audio.buffer] : [],
        );
      } catch {
        this.dispose();
      }
    });
  }
  async start() {
    if (!this.ready || this.stream || this.context) throw new Error("not-ready");
    const id = ++this.captureId;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    if (id !== this.captureId) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("cancelled");
    }
    this.stream = stream;
    this.chunks = [];
    this.samples = 0;
    this.silence = 0;
    this.voiced = false;
    this.ended = false;
    try {
      const context = new AudioContext({ sampleRate: 16000 });
      this.context = context;
      await context.audioWorklet.addModule("/speech-capture.worklet.js");
      if (id !== this.captureId || context.sampleRate !== 16000) throw new Error("cancelled");
      const capture = new AudioWorkletNode(context, "english-capture");
      this.capture = capture;
      capture.port.onmessage = (
        event: MessageEvent<{ samples: Float32Array; sampleRate: number }>,
      ) => {
        const pcm = event.data.samples;
        if (
          id !== this.captureId ||
          event.data.sampleRate !== 16000 ||
          !(pcm instanceof Float32Array) ||
          this.samples + pcm.length > 208000
        )
          return;
        this.chunks.push(pcm);
        this.samples += pcm.length;
        const energy = pcm.reduce((sum, n) => sum + n * n, 0) / pcm.length;
        if (energy >= 0.00001) {
          this.voiced = true;
          this.silence = 0;
        } else this.silence += pcm.length;
        if (this.voiced && this.silence >= 16000 && !this.ended) {
          this.ended = true;
          this.onSilence();
        }
      };
      this.source = context.createMediaStreamSource(stream);
      this.gain = context.createGain();
      this.gain.gain.value = 0;
      this.source.connect(capture);
      capture.connect(this.gain);
      this.gain.connect(context.destination);
      await context.resume();
      if (id !== this.captureId) throw new Error("cancelled");
    } catch (error) {
      if (id === this.captureId) this.abort();
      throw error;
    }
  }
  private pcm() {
    const pcm = new Float32Array(this.samples);
    let offset = 0;
    for (const chunk of this.chunks) {
      pcm.set(chunk, offset);
      offset += chunk.length;
    }
    return pcm;
  }
  async partial(): Promise<string | undefined> {
    if (!this.stream || this.pending || !this.voiced || this.samples < 16000) return undefined;
    const pending = this.send("transcribe", 60000, prepareSpeechAudio(this.pcm()));
    this.inference = pending;
    try {
      return await pending;
    } finally {
      if (this.inference === pending) this.inference = undefined;
    }
  }
  async finish(): Promise<string> {
    if (!this.stream) throw new Error("no-audio");
    const id = this.captureId,
      pcm = this.pcm(),
      voiced = this.voiced;
    this.stopMicrophone();
    this.chunks = [];
    this.samples = 0;
    if (!voiced || pcm.length < 3200) throw new Error("no-speech");
    if (this.inference) await this.inference;
    if (id !== this.captureId) throw new Error("cancelled");
    const prepared = prepareSpeechAudio(pcm);
    pcm.fill(0);
    return this.send("transcribe", 60000, prepared);
  }
  private stopMicrophone() {
    if (this.capture) {
      this.capture.port.onmessage = null;
      this.capture.disconnect();
      this.capture = undefined;
    }
    this.source?.disconnect();
    this.source = undefined;
    this.gain?.disconnect();
    this.gain = undefined;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    if (this.context?.state !== "closed") void this.context?.close();
    this.context = undefined;
  }
  abort() {
    this.captureId++;
    this.stopMicrophone();
    this.chunks.forEach((chunk) => chunk.fill(0));
    this.chunks = [];
    this.samples = 0;
  }
  cancel() {
    if (this.pending) this.dispose();
    else this.abort();
  }
  dispose() {
    this.abort();
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = false;
    const pending = this.pending;
    this.pending = undefined;
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("cancelled"));
    }
  }
}
