import { expect, it } from "vitest";
import { createInitialWorkspace, type WorkspaceState } from "./workspace";
import { practiceHeroPriority } from "./practice-hero-priority";
const now = new Date("2026-11-07T12:00:00Z");
function add(workspace: WorkspaceState, subject: "math" | "english", dates: string[]) {
  workspace.practiceActivities ??= [];
  for (const date of dates)
    workspace.practiceActivities.push({
      id: `${subject}:${date}`,
      islandId: subject === "math" ? "mathematics:foundations" : "english",
      islandName: subject,
      answers: 1,
      correct: 1,
      completedAt: date,
      ...(subject === "english"
        ? {
            englishAttempt: {
              curriculum: 4 as const,
              area: "english" as const,
              part: 0,
              mode: "practice" as const,
              questions: [0],
              correctQuestions: [0],
            },
          }
        : {}),
    });
}
it("abre na maior ofensiva e mantém Matemática como desempate sem urgência", () => {
  const workspace = createInitialWorkspace();
  expect(practiceHeroPriority(workspace, now, "UTC").preferred).toBe("math");
  add(workspace, "english", [
    "2026-11-05T13:00:00Z",
    "2026-11-06T13:00:00Z",
    "2026-11-07T11:00:00Z",
  ]);
  add(workspace, "math", ["2026-11-06T14:00:00Z", "2026-11-07T10:00:00Z"]);
  expect(practiceHeroPriority(workspace, now, "UTC")).toMatchObject({
    preferred: "english",
    english: { streak: 3 },
    math: { streak: 2 },
  });
});
it("prioriza a ofensiva prestes a expirar mesmo com menos dias", () => {
  const workspace = createInitialWorkspace();
  add(workspace, "math", ["2026-11-06T12:30:00Z"]);
  add(workspace, "english", [
    "2026-11-05T13:00:00Z",
    "2026-11-06T13:00:00Z",
    "2026-11-07T11:00:00Z",
  ]);
  expect(practiceHeroPriority(workspace, now, "UTC")).toMatchObject({
    preferred: "math",
    math: { streak: 1, minutesLeft: 30 },
    english: { streak: 3 },
  });
});
it("entre duas urgentes escolhe a que expira primeiro", () => {
  const workspace = createInitialWorkspace();
  add(workspace, "math", ["2026-11-05T12:30:00Z", "2026-11-06T12:30:00Z"]);
  add(workspace, "english", ["2026-11-06T12:15:00Z"]);
  expect(practiceHeroPriority(workspace, now, "UTC").preferred).toBe("english");
});
it("ignora ofensiva expirada e recibos futuros ou ingleses recusados", () => {
  const workspace = createInitialWorkspace();
  add(workspace, "english", [
    "2026-11-05T10:00:00Z",
    "2026-11-06T10:00:00Z",
    "2026-11-08T10:00:00Z",
  ]);
  add(workspace, "math", ["2026-11-07T11:00:00Z"]);
  expect(practiceHeroPriority(workspace, now, "UTC")).toMatchObject({
    preferred: "math",
    english: { streak: 0 },
  });
  workspace.practiceActivities!.push({
    id: "forged",
    islandId: "english",
    islandName: "English",
    answers: 1,
    correct: 2,
    completedAt: "2026-11-07T11:50:00Z",
  });
  expect(practiceHeroPriority(workspace, now, "UTC").english.streak).toBe(0);
});
