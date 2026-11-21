import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const artifact = await readFile("tmp/essay-own-grader/semantic-head.json");
const head = JSON.parse(artifact);
const fixtures = JSON.parse(await readFile("tmp/essay-own-grader/js-head-fixtures.json", "utf8"));
const started = performance.now();
for (const fixture of fixtures) {
  assert.equal(fixture.features.length, head.featureMean.length);
  const scaled = fixture.features.map(
    (value, i) => (value - head.featureMean[i]) / head.featureScale[i],
  );
  const grades = head.weights.map((weights, c) => {
    const raw = weights.reduce((sum, weight, i) => sum + weight * scaled[i], head.intercepts[c]);
    return Math.floor(Math.max(0, Math.min(200, raw)) / 40 + 0.5) * 40;
  });
  assert.deepEqual(grades, fixture.expected);
}
const report = {
  schemaVersion: 1,
  deploymentEnabled: false,
  fixtures: fixtures.length,
  headBytes: artifact.length,
  sha256: createHash("sha256").update(artifact).digest("hex"),
  milliseconds: performance.now() - started,
  qualification:
    "Linear-head arithmetic parity only; not an end-to-end browser or mobile grading test",
};
await writeFile("docs/research/essay-own-js-probe.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
