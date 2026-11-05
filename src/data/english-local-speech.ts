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
  // Fluxo liberado no início da partida: reaproveitado pela atividade para não pedir de novo.
  private held: MediaStream | undefined;
  private previewed = 0;
  // Até onde há voz capturada e qual prévia já cobriu essa voz: se a última prévia já ouviu tudo,
  // o resultado final reaproveita o texto dela em vez de gastar outra passada do modelo.
  private voicedEnd = 0;
  private lastPartial: { covered: number; text: string } | undefined;
  // Com warm(), o contexto e o worklet ficam prontos entre as perguntas e a captura começa sem atraso.
  private keepGraph = false;
  private warming: Promise<void> | undefined;
  private flushing: (() => void) | undefined;
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
  private onTranscript: (text: string) => void = () => undefined;
  subscribeTranscript(listener: (text: string) => void) {
    this.onTranscript = listener;
    return () => {
      this.onTranscript = () => undefined;
    };
  }
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
        if (event.data.type === "partial") {
          const text = (event.data.text ?? "").trim().slice(0, 500);
          if (text) this.onTranscript(text);
          return;
        }
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
  /** Guarda o fluxo já autorizado; as trilhas só são paradas em releaseMicrophone/dispose. */
  adoptMicrophone(stream: MediaStream) {
    if (this.held !== stream) this.held?.getTracks().forEach((track) => track.stop());
    this.held = stream;
  }
  releaseMicrophone() {
    this.held?.getTracks().forEach((track) => track.stop());
    this.held = undefined;
    this.keepGraph = false;
    if (!this.stream) this.closeGraph();
  }
  async start() {
    if (!this.ready || this.stream) throw new Error("not-ready");
    const id = ++this.captureId;
    const held = this.held?.getAudioTracks().some((track) => track.readyState === "live")
      ? this.held
      : undefined;
    const stream =
      held ??
      (await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      }));
    if (id !== this.captureId) {
      if (stream !== this.held) stream.getTracks().forEach((track) => track.stop());
      throw new Error("cancelled");
    }
    this.stream = stream;
    this.previewed = 0;
    this.voicedEnd = 0;
    this.lastPartial = undefined;
    this.chunks = [];
    this.samples = 0;
    this.silence = 0;
    this.voiced = false;
    this.ended = false;
    try {
      await this.warming;
      if (id !== this.captureId) throw new Error("cancelled");
      if (!this.graphReady()) await this.buildGraph();
      if (id !== this.captureId) throw new Error("cancelled");
      const context = this.context!;
      const capture = this.capture!;
      capture.port.onmessage = (event) => this.onChunk(id, event.data);
      this.source = context.createMediaStreamSource(stream);
      this.source.connect(capture);
      await context.resume();
      if (id !== this.captureId) throw new Error("cancelled");
    } catch (error) {
      if (id === this.captureId) this.abort();
      throw error;
    }
  }
  private graphReady() {
    return Boolean(this.context && this.capture && this.gain && this.context.state !== "closed");
  }
  private async buildGraph() {
    const context = new AudioContext({ sampleRate: 16000 });
    try {
      await context.audioWorklet.addModule("/speech-capture.worklet.js");
      if (context.sampleRate !== 16000) throw new Error("cancelled");
      const capture = new AudioWorkletNode(context, "english-capture");
      capture.port.onmessage = (event) => this.onChunk(this.captureId, event.data);
      const gain = context.createGain();
      gain.gain.value = 0;
      capture.connect(gain);
      gain.connect(context.destination);
      this.context = context;
      this.capture = capture;
      this.gain = gain;
    } catch (error) {
      if (context.state !== "closed") void context.close();
      throw error;
    }
  }
  /** Deixa o contexto de áudio e o worklet prontos antes de a pessoa apertar para falar. */
  warm(): Promise<void> {
    this.keepGraph = true;
    if (!this.warming && !this.graphReady())
      this.warming = this.buildGraph()
        .then(
          () => undefined,
          () => undefined,
        )
        .finally(() => {
          this.warming = undefined;
        });
    return this.warming ?? Promise.resolve();
  }
  private onChunk(
    id: number,
    data: { samples: Float32Array; sampleRate: number; flush?: boolean },
  ) {
    const pcm = data.samples;
    if (
      id === this.captureId &&
      data.sampleRate === 16000 &&
      pcm instanceof Float32Array &&
      this.samples + pcm.length <= 208000 &&
      pcm.length > 0
    ) {
      this.chunks.push(pcm);
      this.samples += pcm.length;
      const energy = pcm.reduce((sum, n) => sum + n * n, 0) / pcm.length;
      if (energy >= 0.00001) {
        this.voiced = true;
        this.voicedEnd = this.samples;
        this.silence = 0;
      } else this.silence += pcm.length;
      if (this.voiced && this.silence >= 22400 && !this.ended) {
        this.ended = true;
        this.onSilence();
      }
    }
    if (data.flush) {
      const done = this.flushing;
      this.flushing = undefined;
      done?.();
    }
  }
  /** Pede ao worklet o que sobrou no bloco parcial; segue sem esperar se ele não responder. */
  private flush(): Promise<void> {
    const capture = this.capture;
    if (!capture || typeof capture.port.postMessage !== "function") return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, 150);
      this.flushing = () => {
        clearTimeout(timer);
        resolve();
      };
      capture.port.postMessage("flush");
    });
  }
  private closeGraph() {
    if (this.capture) this.capture.port.onmessage = null;
    this.capture?.disconnect();
    this.capture = undefined;
    this.source?.disconnect();
    this.source = undefined;
    this.gain?.disconnect();
    this.gain = undefined;
    if (this.context && this.context.state !== "closed") void this.context.close();
    this.context = undefined;
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
    if (
      !this.stream ||
      this.pending ||
      !this.voiced ||
      this.samples < 9600 ||
      this.samples - this.previewed < 4800
    )
      return undefined;
    const covered = this.samples;
    this.previewed = covered;
    const pending = this.send("transcribe", 60000, prepareSpeechAudio(this.pcm()));
    this.inference = pending;
    try {
      const text = await pending;
      if (text.trim()) this.lastPartial = { covered, text };
      return text;
    } finally {
      if (this.inference === pending) this.inference = undefined;
    }
  }
  async finish(): Promise<string> {
    if (!this.stream) throw new Error("no-audio");
    const id = this.captureId;
    await this.flush();
    if (id !== this.captureId || !this.stream) throw new Error("cancelled");
    const pcm = this.pcm(),
      voiced = this.voiced,
      voicedEnd = this.voicedEnd;
    this.stopMicrophone();
    this.chunks = [];
    this.samples = 0;
    if (!voiced || pcm.length < 3200) throw new Error("no-speech");
    await this.inference?.catch(() => undefined);
    if (id !== this.captureId) throw new Error("cancelled");
    // A última prévia já ouviu toda a voz (só faltou silêncio): é o resultado, sem outra passada.
    const heard = this.lastPartial;
    if (heard && heard.covered >= voicedEnd - 1600) {
      pcm.fill(0);
      return heard.text.trim().slice(0, 500);
    }
    const prepared = prepareSpeechAudio(pcm);
    pcm.fill(0);
    return this.send("transcribe", 60000, prepared);
  }
  private stopMicrophone() {
    if (this.keepGraph) {
      // Contexto e worklet ficam prontos para a próxima pergunta; só a fonte sai.
      if (this.capture) this.capture.port.onmessage = null;
      this.source?.disconnect();
      this.source = undefined;
    } else this.closeGraph();
    if (this.stream !== this.held) this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
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
    this.releaseMicrophone();
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
