import { env, pipeline } from "@huggingface/transformers";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";

// A local JavaScript runtime probe. This file is not imported by the web app.
env.allowRemoteModels = false;
env.localModelPath = `${resolve("tmp/essay-grading-lab").replaceAll("\\", "/")}/`;
const started = performance.now();
const classifier = await pipeline("text-classification", "onnx-C1", {
  dtype: "q8",
  device: "cpu",
  local_files_only: true,
});
const loadMs = performance.now() - started;
const tests = [];
for (const text of ["teste", "A educação amplia o acesso à cidadania."]) {
  const start = performance.now();
  const prediction = await classifier(text, { top_k: 6 });
  tests.push({ prediction, milliseconds: performance.now() - start });
}
await classifier.dispose();
const report = {
  schemaVersion: 1,
  runtime: "Transformers.js on Node CPU, not browser or physical mobile",
  deploymentEnabled: false,
  remoteModelsAllowed: false,
  loadMs,
  tests,
};
await writeFile("docs/research/essay-grader-js-probe.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ loadMs, tests: tests.length, remoteModelsAllowed: false }));
