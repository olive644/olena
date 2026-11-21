import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const data = await json("docs/research/essay-own-data-audit.json");
const training = await json("docs/research/essay-own-training.json");
const parity = await json("docs/research/essay-own-js-probe.json");
assert.equal(
  data.inputRows,
  data.keptRows + data.invalidRows + data.conflictingRowsExcluded + data.duplicateRowsRemoved,
);
assert.equal(data.deploymentEnabled, false);
assert.equal(training.deploymentEnabled, false);
assert.equal(training.protocol.testUsedForSelection, false);
assert.equal(training.encoding.truncated, false);
assert.equal(training.encoding.totalTokens, training.encoding.encodedTokens);
assert.equal(new Set(data.assignments.map((r) => r.id)).size, data.keptRows);
const themes = new Map();
for (const item of data.assignments) {
  if (themes.has(item.prompt)) assert.equal(themes.get(item.prompt), item.split);
  themes.set(item.prompt, item.split);
}
const heldOut = new Map(
  data.assignments.filter((r) => r.split === "test").map((r) => [r.id, r.prompt]),
);
assert.equal(heldOut.size, training.counts.test);
const valid = (grade) => Number.isInteger(grade) && grade >= 0 && grade <= 200 && grade % 40 === 0;
for (const candidate of training.candidates) {
  assert.equal(candidate.predictions.length, heldOut.size);
  assert.equal(new Set(candidate.predictions.map((row) => row.id)).size, heldOut.size);
  for (const row of candidate.predictions) {
    assert.equal(heldOut.get(row.id), row.prompt);
    assert.equal(row.human.length, 5);
    assert.equal(row.predicted.length, 5);
    assert.ok(row.human.every(valid) && row.predicted.every(valid));
  }
  for (let c = 0; c < 5; c++) {
    const errors = candidate.predictions.map((row) => Math.abs(row.human[c] - row.predicted[c]));
    const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
    const rmse = Math.sqrt(errors.reduce((a, b) => a + b ** 2, 0) / errors.length);
    assert.ok(Math.abs(mae - candidate.testMetrics[c].mae) < 1e-8);
    assert.ok(Math.abs(rmse - candidate.testMetrics[c].rmse) < 1e-8);
    assert.equal(
      candidate.testMetrics[c].byHumanGrade.reduce((sum, row) => sum + row.count, 0),
      heldOut.size,
    );
  }
  const totalErrors = candidate.predictions.map((row) =>
    Math.abs(row.predicted.reduce((a, b) => a + b, 0) - row.human.reduce((a, b) => a + b, 0)),
  );
  assert.ok(
    Math.abs(
      totalErrors.reduce((a, b) => a + b, 0) / totalErrors.length - candidate.testTotalMetrics.mae,
    ) < 1e-8,
  );
  assert.equal(Math.max(...totalErrors), candidate.testTotalMetrics.maxAbsoluteError);
}
assert.equal(parity.deploymentEnabled, false);
assert.equal(parity.sha256, training.artifactSha256);
assert.equal(parity.headBytes, training.exportBytes);
assert.ok(parity.fixtures >= 3);
console.log(
  "Corpus accounting, prompt isolation, full token coverage, 3 candidate metrics and JS head parity verified. Research only.",
);
