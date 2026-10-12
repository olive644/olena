import { test } from "node:test";
import assert from "node:assert/strict";
import { updatesFromPulls } from "./generate-system-updates.mjs";

test("publishes only merged main PRs through the deployed revision", () => {
  const pr = {
    number: 408,
    title: "Agenda",
    base: { ref: "main" },
    merged_at: "2026-10-11T12:00:00Z",
    merge_commit_sha: "current",
  };
  const pulls = [
    pr,
    { ...pr, number: 409, merged_at: null },
    { ...pr, number: 410, base: { ref: "other" } },
    { ...pr, number: 411, merged_at: "2026-10-12T12:00:00Z", merge_commit_sha: "future" },
  ];
  assert.deepEqual(updatesFromPulls(pulls, new Date("2026-10-11T11:59:59Z").getTime(), "current"), [
    { id: 408, version: "beta.408", title: "Agenda", date: pr.merged_at },
  ]);
});
