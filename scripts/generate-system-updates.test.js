import { test } from "node:test";
import assert from "node:assert/strict";
import { githubFailure, githubHeaders, updatesFromPulls } from "./generate-system-updates.mjs";

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

test("o token de leitura vai só no cabeçalho e só quando existe", () => {
  assert.equal(githubHeaders({}).Authorization, undefined);
  assert.equal(githubHeaders({ GITHUB_READ_TOKEN: "" }).Authorization, undefined);
  assert.equal(githubHeaders({ GITHUB_READ_TOKEN: "abc" }).Authorization, "Bearer abc");
  assert.equal(githubHeaders({ GITHUB_READ_TOKEN: "abc" }).Accept, "application/vnd.github+json");
});

test("a falha explica o repositório privado sem revelar o token", () => {
  assert.match(githubFailure(404, {}).message, /GITHUB_READ_TOKEN/);
  assert.match(githubFailure(403, {}).message, /GITHUB_READ_TOKEN/);
  assert.equal(githubFailure(500, {}).message, "GitHub 500");
  const comToken = githubFailure(404, { GITHUB_READ_TOKEN: "segredo-123" });
  assert.equal(comToken.message, "GitHub 404");
  assert.ok(!comToken.message.includes("segredo-123"));
});
