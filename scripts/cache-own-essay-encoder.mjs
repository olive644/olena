import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

const id = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const revision = "2c4055b12046f11709e9df2c122e59ffbdc2f900";
const base = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";
const baseRevision = "e8f8c211226b894fcb81acc59f3b34ba3efd5f42";
const baseResponse = await fetch(
  `https://huggingface.co/api/models/${base}/revision/${baseRevision}`,
  { signal: AbortSignal.timeout(30000) },
);
if (!baseResponse.ok) throw new Error(`Base metadata: ${baseResponse.status}`);
const baseMetadata = await baseResponse.json();
if (baseMetadata.cardData?.license !== "apache-2.0")
  throw new Error("Unexpected base model license");
const root = `tmp/essay-model-evaluation/model-cache/${id}/${revision}`;
const response = await fetch(
  `https://huggingface.co/api/models/${id}/tree/${revision}?recursive=true`,
  { signal: AbortSignal.timeout(30000) },
);
if (!response.ok) throw new Error(`Encoder metadata: ${response.status}`);
const tree = await response.json();
const files = [];
for (const name of [
  "config.json",
  "tokenizer_config.json",
  "tokenizer.json",
  "onnx/model_quantized.onnx",
]) {
  const target = `${root}/${name}`;
  const metadata = tree.find((file) => file.path === name);
  if (!metadata) throw new Error(`Missing pinned encoder file: ${name}`);
  let data = await readFile(target).catch(() => null);
  if (
    !data ||
    data.length !== metadata.size ||
    (metadata.lfs?.oid && createHash("sha256").update(data).digest("hex") !== metadata.lfs.oid)
  ) {
    const download = await fetch(`https://huggingface.co/${id}/resolve/${revision}/${name}`, {
      signal: AbortSignal.timeout(180000),
    });
    if (!download.ok) throw new Error(`Encoder file: ${download.status}`);
    data = Buffer.from(await download.arrayBuffer());
    if (
      data.length !== metadata.size ||
      (metadata.lfs?.oid && createHash("sha256").update(data).digest("hex") !== metadata.lfs.oid)
    )
      throw new Error("Encoder checksum mismatch");
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
  }
  files.push({
    path: name,
    bytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
}
await mkdir("tmp/essay-own-grader", { recursive: true });
await writeFile(
  "tmp/essay-own-grader/encoder-source.json",
  `${JSON.stringify({ id, revision, files, base, declaredBaseLicense: baseMetadata.cardData.license, baseRevisionInspected: baseRevision, deploymentEnabled: false }, null, 2)}\n`,
);
console.log("Pinned encoder cached. Feature extraction can run with remote models disabled.");
