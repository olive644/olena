import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = async (name) => JSON.parse(await readFile(`docs/research/${name}.json`, "utf8"));
const audit = await read("essay-grader-audit");
const smoke = await read("essay-grader-smoke");
assert.equal(audit.models.length, 5);
assert.equal(smoke.results.length, 5);
assert.equal(audit.deploymentEnabled, false);
assert.equal(smoke.deploymentEnabled, false);
const validGrade = (grade) =>
  Number.isInteger(grade) && grade >= 0 && grade <= 200 && grade % 40 === 0;
for (const [index, result] of smoke.results.entries()) {
  const source = audit.models[index];
  assert.equal(result.model, source.id);
  assert.equal(result.revision, source.revision);
  assert.match(source.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.values(source.labels), [0, 40, 80, 120, 160, 200]);
  const rows = result.labeledTest.rows;
  assert.equal(new Set(rows.map((row) => row.rowIndex)).size, rows.length);
  assert.ok(rows.length >= 20);
  assert.ok(rows.every((row) => validGrade(row.human) && validGrade(row.prediction)));
  const mse = rows.reduce((sum, row) => sum + (row.human - row.prediction) ** 2, 0) / rows.length;
  const mae =
    rows.reduce((sum, row) => sum + Math.abs(row.human - row.prediction), 0) / rows.length;
  assert.ok(Math.abs(Math.sqrt(mse) - result.labeledTest.metrics.rmse) < 1e-8);
  assert.ok(Math.abs(mae - result.labeledTest.metrics.mae) < 1e-8);
  assert.ok(result.cases.every((item) => validGrade(item.predictedScore)));
  assert.equal(result.cases.find((item) => item.case === "long-tail")?.truncated, true);
}
const probe = await read("essay-grader-onnx-probe");
assert.equal(probe.deploymentEnabled, false);
assert.ok(probe.q8Bytes > 0 && probe.q8Bytes < probe.floatBytes);
assert.ok(probe.checks.length >= 3);
console.log(
  "Five pinned checkpoints, exploratory metrics and isolated ONNX probe verified. Deployment remains disabled.",
);
