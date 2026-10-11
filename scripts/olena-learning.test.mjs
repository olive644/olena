import { test } from "node:test";
import assert from "node:assert/strict";
import { approvedTrainingRows, draftDigest, lessons } from "./olena-learning.mjs";

test("somente respostas revisadas, sem alteração posterior ou duplicação", () => {
  const draft = { id: "one", prompt: "2 + 2?", answer: "4" };
  const approval = { id: "one", digest: draftDigest(draft), approved: true, reviewer: "owner" };
  assert.equal(approvedTrainingRows([draft], []).length, 0);
  assert.equal(approvedTrainingRows([draft, draft], [approval]).length, 1);
  assert.equal(approvedTrainingRows([{ ...draft, answer: "5" }], [approval]).length, 0);
  assert.equal(approvedTrainingRows([{ ...draft, prompt: "5 + 5?" }], [approval]).length, 0);
  assert.equal(approvedTrainingRows([draft], [{ ...approval, reviewer: "" }]).length, 0);
});
test("corpus público sintético, referências determinísticas e IDs únicos", () => {
  assert.equal(new Set(lessons.map((lesson) => lesson.id)).size, 40);
  for (let index = 0; index < lessons.length; index++) {
    const a = index + 3,
      b = (index % 9) + 2;
    assert.ok(lessons[index].reference.endsWith(`= ${index % 2 ? a * b : a + b}`));
  }
});
