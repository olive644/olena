import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { BertModel, BertTokenizer, Tensor, env, mean_pooling } from "@huggingface/transformers";

const root = "tmp/essay-own-grader";
const promptMode = process.argv.includes("--prompts");
const records = promptMode
  ? JSON.parse(await readFile(`${root}/prompts.json`, "utf8"))
  : (await readFile(`${root}/records.jsonl`, "utf8")).trim().split("\n").map(JSON.parse);
const prefix = promptMode ? "prompt-" : "";
const modelSpec = {
  id: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
  revision: "2c4055b12046f11709e9df2c122e59ffbdc2f900",
  dtype: "q8",
};
env.cacheDir = resolve("tmp/essay-model-evaluation/model-cache");
// Existing pinned cache only. Student/public essay text is never sent to a server.
env.allowRemoteModels = false;
const options = { revision: modelSpec.revision, local_files_only: true };
const tokenizer = await BertTokenizer.from_pretrained(modelSpec.id, options);
const encoder = await BertModel.from_pretrained(modelSpec.id, {
  ...options,
  dtype: "q8",
  device: "cpu",
  session_options: { intraOpNumThreads: 4, interOpNumThreads: 1 },
});
const empty = Array.from(tokenizer("", { return_tensor: true }).input_ids.data, Number);
if (empty.length !== 2) throw new Error("Unexpected special-token layout");
const [cls, sep] = empty;
const width = 768;
const features = new Float32Array(records.length * width);
const tokenCounts = [];
let totalTokens = 0,
  encodedTokens = 0,
  totalChunks = 0;
const started = performance.now();
for (let row = 0; row < records.length; row++) {
  const ids = Array.from(
    tokenizer(records[row].text, { add_special_tokens: false, truncation: false, padding: false })
      .input_ids.data,
    Number,
  );
  const chunks = [];
  for (let start = 0; start < ids.length; start += 126) chunks.push(ids.slice(start, start + 126));
  const average = new Float64Array(384);
  let last;
  for (let start = 0; start < chunks.length; start += 8) {
    const batch = chunks.slice(start, start + 8);
    const length = Math.max(...batch.map((chunk) => chunk.length + 2));
    const tokens = new BigInt64Array(batch.length * length);
    const masks = new BigInt64Array(batch.length * length);
    for (let b = 0; b < batch.length; b++) {
      const values = [cls, ...batch[b], sep];
      for (let j = 0; j < values.length; j++) {
        tokens[b * length + j] = BigInt(values[j]);
        masks[b * length + j] = 1n;
      }
    }
    const input = {
      input_ids: new Tensor("int64", tokens, [batch.length, length]),
      attention_mask: new Tensor("int64", masks, [batch.length, length]),
      token_type_ids: new Tensor("int64", new BigInt64Array(tokens.length), [batch.length, length]),
    };
    const output = await encoder(input);
    const vectors = mean_pooling(output.last_hidden_state, input.attention_mask).normalize(
      2,
      -1,
    ).data;
    for (let b = 0; b < batch.length; b++) {
      last = vectors.slice(b * 384, (b + 1) * 384);
      for (let j = 0; j < 384; j++) average[j] += last[j] * batch[b].length;
      encodedTokens += batch[b].length;
    }
  }
  if (!last) throw new Error("Empty encoded essay");
  const norm = Math.hypot(...average) || 1;
  for (let j = 0; j < 384; j++) {
    features[row * width + j] = average[j] / norm;
    features[row * width + 384 + j] = last[j];
  }
  totalTokens += ids.length;
  totalChunks += chunks.length;
  tokenCounts.push(ids.length);
  if ((row + 1) % 100 === 0)
    console.log(
      JSON.stringify({
        encoded: row + 1,
        total: records.length,
        seconds: Math.round((performance.now() - started) / 1000),
      }),
    );
}
await encoder.dispose();
if (encodedTokens !== totalTokens) throw new Error("Token coverage failure");
const inputSha256 = createHash("sha256")
  .update(await readFile(`${root}/${promptMode ? "prompts.json" : "records.jsonl"}`))
  .digest("hex");
const featuresSha256 = createHash("sha256").update(new Uint8Array(features.buffer)).digest("hex");
await writeFile(`${root}/${prefix}embeddings.f32`, new Uint8Array(features.buffer));
await writeFile(
  `${root}/${prefix}embedding-index.json`,
  `${JSON.stringify({ model: modelSpec, width, rows: records.map((record, i) => ({ id: record.id, tokens: tokenCounts[i] })), totalTokens, encodedTokens, totalChunks, truncated: false, seconds: (performance.now() - started) / 1000, inputSha256, featuresSha256 })}\n`,
);
console.log(
  JSON.stringify({
    complete: true,
    rows: records.length,
    totalTokens,
    totalChunks,
    featureBytes: features.byteLength,
  }),
);
