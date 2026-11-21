import { env, BertModel, BertTokenizer, mean_pooling } from "@huggingface/transformers";
import wasmUrl from "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm?url";
import wasmModuleUrl from "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs?url";
import {
  assessEssayTopic,
  essayTopicChunks,
  ESSAY_TOPIC_MODEL,
  topicInputWarning,
  type EssayTopicProfile,
} from "../domain/essay-topic";

env.allowLocalModels = false;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.wasmPaths = { wasm: wasmUrl, mjs: wasmModuleUrl };
}
const loadModel = async () => {
  const [tokenizer, encoder] = await Promise.all([
    BertTokenizer.from_pretrained(ESSAY_TOPIC_MODEL.id, { revision: ESSAY_TOPIC_MODEL.revision }),
    BertModel.from_pretrained(ESSAY_TOPIC_MODEL.id, {
      revision: ESSAY_TOPIC_MODEL.revision,
      dtype: "q8",
      device: "wasm",
    }),
  ]);
  return { tokenizer, encoder };
};
let model: ReturnType<typeof loadModel> | undefined;
let profiles: Promise<EssayTopicProfile[]> | undefined;
self.onmessage = async (event: MessageEvent<{ id: number; text: string; topicId: string }>) => {
  const { id, text, topicId } = event.data;
  try {
    const warning = topicInputWarning(text);
    if (warning) {
      self.postMessage({ id, result: { status: "inconclusive", reason: warning, evidence: [] } });
      return;
    }
    self.postMessage({ id, progress: "loading" });
    profiles ??= fetch("/essay-topics/profiles.json").then(async (response) => {
      if (!response.ok) throw new Error("Profiles unavailable");
      const data: {
        version: number;
        model: { id: string; revision: string };
        profiles: EssayTopicProfile[];
      } = await response.json();
      if (
        data.version !== 1 ||
        data.model.revision !== ESSAY_TOPIC_MODEL.revision ||
        data.model.id !== ESSAY_TOPIC_MODEL.id ||
        data.profiles.length !== 60
      )
        throw new Error("Profile version mismatch");
      return data.profiles;
    });
    model ??= loadModel();
    const [extractor, references] = await Promise.all([model, profiles]);
    const chunks = essayTopicChunks(text);
    const segments = [];
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index]!;
      const inputs = await extractor.tokenizer(chunk.text, {
        padding: true,
        truncation: true,
        max_length: 128,
      });
      const output = await extractor.encoder(inputs);
      const embedding = mean_pooling(
        output["last_hidden_state"],
        inputs["attention_mask"],
      ).normalize(2, -1);
      segments.push({ ...chunk, vector: Array.from(embedding.data, Number) });
      self.postMessage({ id, progress: "analyzing", completed: index + 1, total: chunks.length });
    }
    self.postMessage({ id, result: assessEssayTopic(text, topicId, references, segments) });
  } catch {
    model = undefined;
    profiles = undefined;
    self.postMessage({ id, error: true });
  }
};
