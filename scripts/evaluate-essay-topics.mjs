// Research-only harness. No app dependency, remote inference or automatic essay grade.
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import os from "node:os";

const runtimeRoot = process.argv[2];
if (!runtimeRoot)
  throw new Error(
    "Usage: node scripts/evaluate-essay-topics.mjs <isolated-runtime-directory> [model]",
  );
const modelName = process.argv[3] ?? "minilm";
const offline = process.argv[4] === "offline";
const models = {
  minilm: {
    id: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
    revision: "2c4055b12046f11709e9df2c122e59ffbdc2f900",
  },
  e5: { id: "Xenova/multilingual-e5-small", revision: "761b726dd34fb83930e26aab4e9ac3899aa1fa78" },
};
const model = models[modelName];
if (!model) throw new Error("Unknown model");
const { pipeline, env } = await import(
  pathToFileURL(
    path.resolve(runtimeRoot, "node_modules/@huggingface/transformers/dist/transformers.node.mjs"),
  ).href
);
env.cacheDir = path.resolve(runtimeRoot, "model-cache");
if (offline) {
  // Failure is preferable to silently depending on remote inference or downloads.
  globalThis.fetch = () => Promise.reject(new Error("Network disabled for offline benchmark"));
}
const fixtures = JSON.parse(
  await fs.readFile(new URL("./data/essay-topic-evaluation.json", import.meta.url), "utf8"),
);
const started = performance.now();
const extractor = await pipeline("feature-extraction", model.id, {
  revision: model.revision,
  dtype: "q8",
  device: "cpu",
  local_files_only: offline,
});
const loadMs = performance.now() - started;
async function vector(text) {
  const output = await extractor(modelName === "e5" ? "query: " + text : text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
}
const cosine = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const references = [];
for (const topic of fixtures.topics)
  references.push({ id: topic.id, vector: await vector(topic.reference) });
const results = [];
for (const sample of fixtures.samples) {
  const time = performance.now();
  const embedding = await vector(sample.text);
  const ranked = references
    .map((ref) => ({ id: ref.id, similarity: cosine(embedding, ref.vector) }))
    .sort((a, b) => b.similarity - a.similarity);
  results.push({
    id: sample.id,
    kind: sample.kind,
    expectedTopic: sample.topicId,
    firstTopic: ranked[0].id,
    firstSimilarity: ranked[0].similarity,
    targetSimilarity: ranked.find((item) => item.id === sample.topicId).similarity,
    margin: ranked[0].similarity - ranked[1].similarity,
    elapsedMs: performance.now() - time,
  });
}
await extractor.dispose();
const relevant = results.filter(
  (result) => result.kind === "relevant" || result.kind === "paraphrase",
);
const durations = results.map((result) => result.elapsedMs).sort((a, b) => a - b);
const report = {
  generatedAt: new Date().toISOString(),
  model,
  runtime: "@huggingface/transformers@3.8.1",
  device: "cpu",
  offline,
  cpu: os.cpus()[0]?.model,
  loadMs,
  rssAfterBytes: process.memoryUsage().rss,
  sampleCount: results.length,
  relevantTop1: relevant.filter((result) => result.firstTopic === result.expectedTopic).length,
  relevantCount: relevant.length,
  medianMs: durations[Math.floor(durations.length / 2)],
  maxMs: durations.at(-1),
  results,
  limitation:
    "Authored smoke fixtures, not human-scored essays. Similarity is not argument quality, grammar assessment or an ENEM score. No production threshold is calibrated by this run.",
};
const destination = new URL(
  `../docs/research/essay-topic-${modelName}${offline ? "-offline" : ""}.json`,
  import.meta.url,
);
await fs.mkdir(new URL("../docs/research/", import.meta.url), { recursive: true });
await fs.writeFile(destination, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    model: model.id,
    loadMs,
    relevantTop1: report.relevantTop1,
    relevantCount: report.relevantCount,
    medianMs: report.medianMs,
    maxMs: report.maxMs,
    rssAfterBytes: report.rssAfterBytes,
  }),
);
