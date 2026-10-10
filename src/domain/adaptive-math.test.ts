import { expect, it } from "vitest";
import { mathChallenge, assessMath } from "./adaptive-math";
import { MATH_COURSES, EMPTY_MATH_PROGRESS } from "../data/math-courses";
import { handleOlena } from "../backend/olena-handler";
it("produces distinct finite choices and longer but faster-draining higher topics", () => {
  for (const course of MATH_COURSES)
    for (let level = 0; level < 6; level++)
      for (let seed = 1; seed <= 30; seed++) {
        const question = mathChallenge(course.id, { ...EMPTY_MATH_PROGRESS, level }, seed * 1009);
        expect(Number.isFinite(question.answer)).toBe(true);
        expect(new Set(question.choices).size).toBe(4);
        expect(question.choices).toContain(question.answer);
        expect(question.topic).toBe(course.topics[level]);
        expect(question.budget / question.drain).toBeGreaterThanOrEqual(14);
      }
});
it("advances on mastery and preserves levels after mistakes", () => {
  const progress = { ...EMPTY_MATH_PROGRESS, mastery: 2 };
  const question = mathChallenge("foundations", progress, 99);
  const good = assessMath(progress, question, question.answer, 1, 0);
  expect(good.progress.level).toBe(1);
  expect(good.points).toBeGreaterThan(0);
  const wrong = assessMath(good.progress, question, question.answer + 1, 8, 4);
  expect(wrong.streak).toBe(0);
  expect(wrong.progress.level).toBe(1);
  expect(wrong.points).toBe(0);
});
it("API validates its generated question independent of JSON key ordering", async () => {
  const call = (body: unknown) =>
    handleOlena(
      new Request("http://localhost/api/olena?action=math&version=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  const progress = { ...EMPTY_MATH_PROGRESS };
  const generated = await call({ action: "question", course: "foundations", progress });
  const { question } = (await generated.json()) as { question: ReturnType<typeof mathChallenge> };
  const reordered = Object.fromEntries(Object.entries(question).reverse());
  const body = {
    action: "answer",
    course: "foundations",
    progress,
    question: reordered,
    choice: question.answer,
    elapsed: 1,
    streak: 0,
  };
  expect((await call(body)).status).toBe(200);
  expect((await call({ ...body, question: { ...question, answer: 999 } })).status).toBe(400);
  expect((await call({ ...body, progress: { ...progress, level: 999 } })).status).toBe(400);
});
