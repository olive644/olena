import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LocalEnglishSpeech } from "./english-local-speech";
let client: LocalEnglishSpeech;
const stop = vi.fn();
let worker: FakeWorker;
class FakeWorker {
  onmessage: ((event: { data: { id: number; type: string; text?: string } }) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  messages: { type: string; id: number; audio?: Float32Array }[] = [];
  postMessage(message: { type: string; id: number; audio?: Float32Array }) {
    this.messages.push(message);
  }
  reply(type: string, text?: string) {
    this.onmessage?.({ data: { id: this.messages.at(-1)!.id, type, ...(text ? { text } : {}) } });
  }
}
const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
beforeEach(() => {
  vi.stubGlobal(
    "Worker",
    class {
      constructor() {
        worker = new FakeWorker();
        return worker;
      }
    },
  );
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
  client = new LocalEnglishSpeech();
  vi.clearAllMocks();
});
afterEach(() => {
  client.dispose();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function ready() {
  const pending = client.load();
  worker.reply("ready");
  await pending;
}
it("never downloads or captures before an explicit action and reuses the prepared model", async () => {
  expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  await ready();
  expect(worker.messages).toEqual([{ type: "load", id: 1 }]);
  await client.load();
  expect(worker.messages).toHaveLength(1);
});
it("rejects overlapping worker jobs without losing the first promise", async () => {
  const first = client.load();
  await expect(client.load()).rejects.toThrow("busy");
  worker.reply("ready");
  await first;
  expect(client.ready).toBe(true);
});
it("cancels a pending model download and ignores late completion", async () => {
  const pending = client.load();
  const rejected = expect(pending).rejects.toThrow("cancelled");
  client.cancel();
  worker.reply("ready");
  await rejected;
  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(client.ready).toBe(false);
});
it("stops a microphone granted after cancellation without starting a recording", async () => {
  await ready();
  let grant: ((stream: MediaStream) => void) | undefined;
  vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
  );
  const pending = client.start();
  const rejected = expect(pending).rejects.toThrow("cancelled");
  client.cancel();
  grant!(stream);
  await rejected;
  expect(stop).toHaveBeenCalledOnce();
  expect(client.ready).toBe(true);
});
it("cleans up capture when AudioContext construction fails", async () => {
  await ready();
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        throw new Error("capture");
      }
    },
  );
  await expect(client.start()).rejects.toThrow("capture");
  expect(stop).toHaveBeenCalledOnce();
});
it("terminates a stalled model job and settles its promise", async () => {
  vi.useFakeTimers();
  const pending = client.load();
  const rejected = expect(pending).rejects.toThrow("cancelled");
  await vi.advanceTimersByTimeAsync(180000);
  await rejected;
  expect(worker.terminate).toHaveBeenCalledOnce();
});

type CapturePort = {
  onmessage: ((event: { data: { samples: Float32Array; sampleRate: number } }) => void) | null;
};
function capture(samples: Float32Array) {
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "running";
      sampleRate = 16000;
      audioWorklet = { addModule: async () => undefined };
      destination = {};
      createMediaStreamSource() {
        return { connect: () => undefined, disconnect: () => undefined };
      }
      createGain() {
        return { gain: { value: 1 }, connect: () => undefined, disconnect: () => undefined };
      }
      async resume() {}
      async close() {
        this.state = "closed";
      }
    },
  );
  vi.stubGlobal(
    "AudioWorkletNode",
    class {
      port = { onmessage: null } as CapturePort;
      constructor() {
        Object.assign(holder, { port: this.port });
        queueMicrotask(() => this.port.onmessage?.({ data: { samples, sampleRate: 16000 } }));
      }
      connect() {}
      disconnect() {}
    },
  );
}
const holder: { port?: CapturePort } = {};

it("rejects silence after stopping tracks without sending audio to the model", async () => {
  await ready();
  capture(new Float32Array(16000));
  await client.start();
  await expect(client.finish()).rejects.toThrow("no-speech");
  expect(stop).toHaveBeenCalledOnce();
  expect(worker.messages).toHaveLength(1);
});
it("transcribes bounded PCM only in its worker, after stopping microphone tracks", async () => {
  await ready();
  capture(new Float32Array(16000).fill(0.02));
  await client.start();
  const pending = client.finish();
  await vi.waitFor(() => expect(worker.messages.at(-1)?.type).toBe("transcribe"));
  expect(stop).toHaveBeenCalledOnce();
  expect(worker.messages.at(-1)?.audio).toHaveLength(16000);
  worker.reply("result", "What is your name?");
  await expect(pending).resolves.toBe("What is your name?");
});

it("signals a pause after voice once, without automatically evaluating audio", async () => {
  await ready();
  capture(new Float32Array(16000).fill(0.02));
  const ended = vi.fn();
  client.subscribeSilence(ended);
  await client.start();
  holder.port!.onmessage!({ data: { samples: new Float32Array(22400), sampleRate: 16000 } });
  holder.port!.onmessage!({ data: { samples: new Float32Array(16000), sampleRate: 16000 } });
  expect(ended).toHaveBeenCalledOnce();
  expect(worker.messages).toHaveLength(1);
});
it("sends the model a trimmed, level-corrected copy of a quiet recording with silence around it", async () => {
  await ready();
  const quiet = new Float32Array(16000 * 3);
  for (let n = 16000; n < 16000 * 2; n++)
    quiet[n] = 0.03 * Math.sin((2 * Math.PI * 200 * n) / 16000);
  capture(quiet);
  await client.start();
  const pending = client.finish();
  await vi.waitFor(() => expect(worker.messages.at(-1)?.type).toBe("transcribe"));
  const sent = worker.messages.at(-1)!.audio!;
  expect(sent.length).toBeLessThan(quiet.length * 0.9);
  expect(sent.length).toBeGreaterThan(16000);
  expect(sent.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0)).toBeGreaterThan(0.8);
  worker.reply("result", "Are you from Brazil?");
  await expect(pending).resolves.toBe("Are you from Brazil?");
});

it("delivers streamed words without settling the inference until its final result", async () => {
  await ready();
  capture(new Float32Array(16000).fill(0.02));
  await client.start();
  const transcript = vi.fn();
  client.subscribeTranscript(transcript);
  const finished = client.finish();
  await vi.waitFor(() => expect(worker.messages.at(-1)?.type).toBe("transcribe"));
  worker.reply("partial", "What is");
  expect(transcript).toHaveBeenLastCalledWith("What is");
  let settled = false;
  void finished.then(() => {
    settled = true;
  });
  await Promise.resolve();
  expect(settled).toBe(false);
  worker.reply("partial", "What is your name?");
  worker.reply("result", "What is your name?");
  await expect(finished).resolves.toBe("What is your name?");
  client.cancel();
  worker.reply("partial", "stale text");
  expect(transcript).not.toHaveBeenCalledWith("stale text");
});
