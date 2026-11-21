import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  assessEssayTopic,
  essayTopicChunks,
  ESSAY_TOPIC_MODEL,
} from "../src/domain/essay-topic.ts";
const { pipeline, env } = await import(
  pathToFileURL(
    path.resolve(
      "tmp/essay-model-evaluation/node_modules/@huggingface/transformers/dist/transformers.node.mjs",
    ),
  ).href
);
env.cacheDir = path.resolve("tmp/essay-model-evaluation/model-cache");
const extractor = await pipeline("feature-extraction", ESSAY_TOPIC_MODEL.id, {
  revision: ESSAY_TOPIC_MODEL.revision,
  dtype: "q8",
  device: "cpu",
  local_files_only: true,
});
const fixtures = JSON.parse(await fs.readFile("scripts/data/essay-topic-evaluation.json", "utf8"));
const profiles = JSON.parse(await fs.readFile("public/essay-topics/profiles.json", "utf8"));
const extended = JSON.parse(
  await fs.readFile("scripts/data/essay-topic-triage-cases.json", "utf8"),
);
fixtures.samples.push(...extended.samples);
const results = [];
for (const sample of fixtures.samples) {
  const segments = [];
  for (const chunk of essayTopicChunks(sample.text))
    segments.push({
      ...chunk,
      vector: Array.from((await extractor(chunk.text, { pooling: "mean", normalize: true })).data),
    });
  const result = assessEssayTopic(sample.text, sample.topicId, profiles.profiles, segments);
  results.push({
    id: sample.id,
    kind: sample.kind,
    status: result.status,
    reason: result.reason,
    evidence: result.evidence.map((x) => x.relation),
  });
}
console.log(JSON.stringify(results, null, 2));
await fs.writeFile(
  "docs/research/essay-topic-triage-smoke.json",
  JSON.stringify(
    {
      model: ESSAY_TOPIC_MODEL,
      results,
      limitation: "Author-created smoke fixtures, not calibration against human judgments.",
    },
    null,
    2,
  ) + "\n",
);
await extractor.dispose();
