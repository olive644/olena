import { mkdir, writeFile } from "node:fs/promises";

// Public metadata only: no inference endpoint, access token or student text.
const revisions = [
  "1ad2e0f61009276ce3c1d23b24b6f55e0eb102d8",
  "3afae7b80c36bf0042b19778620a0ad1135b7135",
  "bad03f1db697f1fb612e4d74bb55d6f0e8cd7a16",
  "be129129fc134c0e782ae9f62b33da331367ab7b",
  "fb36ac8b730b27c491174f81a69d6da1c0962026",
];
async function get(url, json = true) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return json ? response.json() : response.text();
}
const models = await Promise.all(
  revisions.map(async (revision, index) => {
    const id = `kamel-usp/jbcs2025_bertimbau_base-C${index + 1}`;
    const base = `https://huggingface.co/${id}`;
    const [metadata, files, config, card] = await Promise.all([
      get(`https://huggingface.co/api/models/${id}/revision/${revision}`),
      get(`https://huggingface.co/api/models/${id}/tree/${revision}`),
      get(`${base}/raw/${revision}/config.json`),
      get(`${base}/raw/${revision}/README.md`, false),
    ]);
    const metric = (name) => Number(card.match(new RegExp(`\\| ${name}\\s*\\|\\s*([\\d.]+)`))?.[1]);
    const weights = files.find((file) => file.path === "model.safetensors");
    const licenseFiles = files.filter((file) => /(^|\/)(license|copying)(\.|$)/i.test(file.path));
    return {
      id,
      revision,
      source: base,
      license: metadata.cardData?.license ?? null,
      licenseFiles: licenseFiles.map((file) => file.path),
      bytes: weights?.size ?? null,
      sha256: weights?.lfs?.oid ?? null,
      browserReady: files.some((file) => file.path.endsWith(".onnx")),
      hasTokenizer: files.some(
        (file) => file.path === "tokenizer.json" || file.path === "vocab.txt",
      ),
      architecture: config.architectures,
      maxTokens: config.max_position_embeddings,
      labels: config.id2label,
      publishedMetrics: {
        accuracy: metric("eval_accuracy"),
        rmse: metric("eval_RMSE"),
        qwk: metric("eval_QWK"),
      },
      metricsAreIndependentlyReproduced: false,
    };
  }),
);
if (
  models.some((model) =>
    Object.values(model.publishedMetrics).some((value) => !Number.isFinite(value)),
  )
)
  throw new Error("Unrecognized metrics format");
const report = {
  schemaVersion: 1,
  models,
  totalWeightBytes: models.reduce((sum, model) => sum + model.bytes, 0),
  deploymentEnabled: false,
  blockers: [
    "No explicit fine-tuned weight license found",
    "No ONNX files or tokenizer in checkpoints",
    "512-token limit requires verified input handling",
    "No independent grading-quality evaluation yet",
  ],
};
await mkdir("docs/research", { recursive: true });
await writeFile("docs/research/essay-grader-audit.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify({
    models: models.length,
    totalWeightBytes: report.totalWeightBytes,
    deploymentEnabled: false,
    blockers: report.blockers,
  }),
);
