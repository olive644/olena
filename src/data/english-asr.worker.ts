import { env, pipeline, WhisperTextStreamer, WhisperTokenizer } from "@huggingface/transformers";
import { VOICE_MODEL, VOICE_REVISION } from "./english-asr-model";

env.allowLocalModels = false;
env.useBrowserCache = true;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.wasmPaths = "/speech-runtime/";
}
const MODEL = VOICE_MODEL;
const REVISION = VOICE_REVISION;
let transcriber: Awaited<ReturnType<typeof load>> | undefined;
function load() {
  return pipeline("automatic-speech-recognition", MODEL, {
    revision: REVISION,
    dtype: "q8",
    device: "wasm",
    progress_callback: (event) => {
      if (event.status === "progress")
        self.postMessage({ type: "progress", file: event.file, progress: event.progress });
    },
  });
}
let busy = false;
self.onmessage = async (
  event: MessageEvent<{ type: "load" | "transcribe"; id: number; audio?: Float32Array }>,
) => {
  if (busy) return;
  busy = true;
  const { id, type, audio } = event.data;
  try {
    transcriber ??= await load();
    if (type === "load") self.postMessage({ id, type: "ready" });
    else {
      if (
        !audio ||
        audio.length < 3200 ||
        audio.length > 16_000 * 13 ||
        !audio.every(Number.isFinite)
      )
        throw new Error("invalid-audio");
      if (!(transcriber.tokenizer instanceof WhisperTokenizer))
        throw new Error("invalid-tokenizer");
      let preview = "";
      const streamer = new WhisperTextStreamer(transcriber.tokenizer, {
        skip_prompt: true,
        callback_function: (text: string) => {
          preview = (preview + text).slice(0, 500);
          self.postMessage({ id, type: "partial", text: preview.trim() });
        },
      });
      const result = await transcriber(audio, {
        max_new_tokens: 100,
        return_timestamps: false,
        streamer,
      });
      const text = Array.isArray(result) ? result[0]?.text : result.text;
      self.postMessage({ id, type: "result", text: (text ?? "").trim().slice(0, 500) });
    }
  } catch {
    self.postMessage({ id, type: "error" });
  } finally {
    audio?.fill(0);
    busy = false;
  }
};
