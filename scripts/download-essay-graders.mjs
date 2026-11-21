import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";

// Research cache only. Never downloads training_args.bin or executes remote code.
const report = JSON.parse(await readFile("docs/research/essay-grader-audit.json", "utf8"));
async function digest(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
for (const [index, model] of report.models.entries()) {
  const folder = `tmp/essay-grading-lab/checkpoints/C${index + 1}`;
  await mkdir(folder, { recursive: true });
  for (const name of ["config.json", "model.safetensors"]) {
    const target = `${folder}/${name}`;
    if (name === "model.safetensors" && (await digest(target).catch(() => "")) === model.sha256)
      continue;
    console.log(`Downloading C${index + 1} ${name}`);
    const response = await fetch(
      `https://huggingface.co/${model.id}/resolve/${model.revision}/${name}`,
      { signal: AbortSignal.timeout(240000) },
    );
    if (!response.ok || !response.body) throw new Error(`Download failed: ${response.status}`);
    const partial = `${target}.partial`;
    await pipeline(response.body, createWriteStream(partial));
    if (name === "model.safetensors" && (await digest(partial)) !== model.sha256) {
      await rm(partial);
      throw new Error("Weight checksum mismatch");
    }
    await rename(partial, target);
  }
}
const tokenizerFolder = "tmp/essay-grading-lab/tokenizer";
await mkdir(tokenizerFolder, { recursive: true });
const baseRevision = "94d69c95f98f7d5b2a8700c420230ae10def0baa";
for (const name of [
  "config.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "vocab.txt",
]) {
  const response = await fetch(
    `https://huggingface.co/neuralmind/bert-base-portuguese-cased/resolve/${baseRevision}/${name}`,
    { signal: AbortSignal.timeout(30000) },
  );
  if (!response.ok) throw new Error(`Tokenizer download failed: ${response.status}`);
  await writeFile(`${tokenizerFolder}/${name}`, Buffer.from(await response.arrayBuffer()));
}
const dataset = "kamel-usp/aes_enem_dataset";
const revision = "8df4b700221dc20410e1e28900bbf215da545347";
const response = await fetch(
  `https://huggingface.co/datasets/${dataset}/resolve/${revision}/JBCS2025/test-00000-of-00001.parquet`,
  { signal: AbortSignal.timeout(30000) },
);
if (!response.ok) throw new Error(`Test data download failed: ${response.status}`);
const testPath = "tmp/essay-grading-lab/test.parquet";
await writeFile(testPath, Buffer.from(await response.arrayBuffer()));
await writeFile(
  "tmp/essay-grading-lab/test-source.json",
  JSON.stringify({
    dataset,
    revision,
    config: "JBCS2025",
    split: "test",
    sha256: await digest(testPath),
    metadataLicense: "apache-2.0",
    licenseDescriptionConflict: "MIT in dataset card",
  }),
);
console.log("Research weights, tokenizer and public test split ready. Nothing copied to public/.");
