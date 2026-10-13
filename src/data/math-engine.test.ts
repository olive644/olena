import { afterEach, expect, it, vi } from "vitest";
import { requestMath } from "./math-learning";
import { EMPTY_MATH_PROGRESS, MATH_COURSES } from "./math-courses";
import { mathChallenge, assessMath } from "../domain/adaptive-math";
import { handleOlena } from "../backend/olena-handler";

afterEach(() => vi.unstubAllGlobals());
it.each(MATH_COURSES)(
  "assesses $id immediately without network and agrees with the API",
  async (course) => {
    const fetcher = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetcher);
    const progress = { ...EMPTY_MATH_PROGRESS, mastery: 5 };
    const question = mathChallenge(course.id, progress, 99);
    const input = {
      action: "answer" as const,
      course: course.id,
      progress,
      question,
      choice: question.answer,
      elapsed: 1,
      streak: 5,
    };
    const result = await requestMath(input, new AbortController().signal);
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.correct).toBe(true);
    expect(result.milestone).toEqual({ topic: question.topic, courseComplete: false });
    const response = await handleOlena(
      new Request("http://localhost/api/olena?action=math&version=2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Olena-API-Version")).toBe("2");
    const remote = await response.json();
    expect(remote.progress).toEqual(result.progress);
    expect(remote.milestone).toEqual(result.milestone);
    expect(remote.points).toBe(result.points);
  },
);
it("requires six consecutive correct answers, only celebrates once and resets the run after a mistake", () => {
  let progress = { ...EMPTY_MATH_PROGRESS };
  for (let index = 0; index < 6; index++) {
    const question = mathChallenge("foundations", progress, 99);
    const result = assessMath(progress, question, question.answer, 1, index);
    expect(Boolean(result.milestone)).toBe(index === 5);
    progress = result.progress;
  }
  expect(progress.mastered).toBe(1);
  expect(progress.level).toBe(1);
  const repeat = { ...progress, level: 0, mastery: 5 };
  const question = mathChallenge("foundations", repeat, 99);
  expect(assessMath(repeat, question, question.answer, 1, 0).milestone).toBeNull();
  expect(assessMath(repeat, question, question.answer + 1, 1, 0).progress.mastery).toBe(0);
});
it("keeps the original API contract readable by old tabs", async () => {
  const progress = { ...EMPTY_MATH_PROGRESS, mastery: 2 };
  const question = mathChallenge("foundations", progress, 99);
  const response = await handleOlena(
    new Request("http://localhost/api/olena?action=math&version=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "answer",
        course: "foundations",
        progress,
        question,
        choice: question.answer,
        elapsed: 1,
        streak: 0,
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("X-Olena-API-Version")).toBe("1");
  const result = await response.json();
  expect(result.progress).toEqual({
    ...EMPTY_MATH_PROGRESS,
    level: 1,
    mastery: 0,
    errors: 0,
    correct: 1,
  });
  expect(result.progress).not.toHaveProperty("mastered");
  expect(result).not.toHaveProperty("milestone");
});
it("completes a place only after all six topics and never repeats the final celebration", () => {
  const progress = { ...EMPTY_MATH_PROGRESS, level: 5, mastery: 5, mastered: 31 };
  const question = mathChallenge("school", progress, 99);
  const result = assessMath(progress, question, question.answer, 1, 0);
  expect(result.progress.mastered).toBe(63);
  expect(result.milestone?.courseComplete).toBe(true);
  expect(assessMath(result.progress, question, question.answer, 1, 0).milestone).toBeNull();
});
it("starts offline, rejects changed questions and honors cancellation", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const signal = new AbortController().signal;
  const input = {
    action: "question" as const,
    course: "foundations" as const,
    progress: EMPTY_MATH_PROGRESS,
  };
  const { question } = await requestMath(input, signal);
  await expect(
    requestMath(
      {
        ...input,
        action: "answer",
        question: { ...question, answer: 999 },
        choice: 999,
        elapsed: 1,
        streak: 0,
      },
      signal,
    ),
  ).rejects.toThrow("Resposta inválida");
  const cancelled = new AbortController();
  cancelled.abort();
  await expect(requestMath(input, cancelled.signal)).rejects.toThrow();
});
