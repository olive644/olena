import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ESSAY_PROPOSALS } from "../src/data/essay-catalog.ts";
const runtime = process.argv[2];
if (!runtime) throw new Error("Pass isolated Transformers.js runtime directory");
const { pipeline, env } = await import(
  pathToFileURL(
    path.resolve(runtime, "node_modules/@huggingface/transformers/dist/transformers.node.mjs"),
  ).href
);
env.cacheDir = path.resolve(runtime, "model-cache");
const model = {
  id: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
  revision: "2c4055b12046f11709e9df2c122e59ffbdc2f900",
};
const extractor = await pipeline("feature-extraction", model.id, {
  revision: model.revision,
  dtype: "q8",
  device: "cpu",
  local_files_only: true,
});
const vector = async (text) =>
  Array.from(
    (await extractor(text, { pooling: "mean", normalize: true })).data,
    (value) => Math.round(value * 1e6) / 1e6,
  );
const profiles = [];
for (const proposal of ESSAY_PROPOSALS) {
  const support = proposal.support.split("Para desenvolver uma posição")[0].trim();
  const focus = await vector(proposal.title);
  const expanded = await vector(proposal.title + ". " + support);
  const mixed = focus.map((value, index) => value * 0.65 + expanded[index] * 0.35);
  const norm = Math.hypot(...mixed);
  profiles.push({
    id: proposal.id,
    title: proposal.title,
    category: proposal.categoryId,
    focus,
    vector: mixed.map((value) => Math.round((value / norm) * 1e6) / 1e6),
  });
}
await extractor.dispose();
await fs.mkdir("public/essay-topics", { recursive: true });
await fs.writeFile(
  "public/essay-topics/profiles.json",
  JSON.stringify({ version: 1, model, profiles }) + "\n",
);
console.log("Generated 60 topic profiles using pinned local model.");
