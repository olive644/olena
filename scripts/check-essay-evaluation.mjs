import assert from "node:assert/strict";
import fs from "node:fs/promises";

const fixtures = JSON.parse(
  await fs.readFile(new URL("./data/essay-topic-evaluation.json", import.meta.url), "utf8"),
);
assert.equal(fixtures.topics.length, 6);
assert.equal(new Set(fixtures.samples.map((sample) => sample.id)).size, fixtures.samples.length);
for (const model of ["minilm", "e5"]) {
  for (const suffix of ["", "-offline"]) {
    const result = JSON.parse(
      await fs.readFile(
        new URL(`../docs/research/essay-topic-${model}${suffix}.json`, import.meta.url),
        "utf8",
      ),
    );
    assert.equal(result.offline ?? false, suffix === "-offline");
    assert.equal(result.sampleCount, fixtures.samples.length);
    assert.match(result.model.revision, /^[a-f0-9]{40}$/);
    assert.deepEqual(
      result.results.map((item) => item.id),
      fixtures.samples.map((sample) => sample.id),
    );
    const relevant = result.results.filter((item) =>
      ["relevant", "paraphrase"].includes(item.kind),
    );
    assert.equal(result.relevantCount, relevant.length);
    assert.equal(
      result.relevantTop1,
      relevant.filter((item) => item.firstTopic === item.expectedTopic).length,
    );
    for (const row of result.results) {
      assert.ok(Number.isFinite(row.elapsedMs) && row.elapsedMs >= 0);
      assert.ok(row.firstSimilarity >= -1.0001 && row.firstSimilarity <= 1.0001);
      assert.ok(fixtures.topics.some((topic) => topic.id === row.firstTopic));
      assert.equal("score" in row, false);
    }
  }
}
console.log(
  "Four evaluation reports match the 26 authored fixtures. No essay grades are inferred.",
);
