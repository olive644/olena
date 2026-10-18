import { expect, it } from "vitest";
import { agendaSubjects, agendaSubjectName, agendaItemColor } from "./agenda-subjects";
import { PRACTICE_ISLANDS } from "../data/practice-islands";
import { createInitialWorkspace, workspaceReducer } from "./workspace";
import { mergeWorkspaceStates } from "./workspace-sync-merge";

it("uses the island catalog and stable IDs without duplicate subjects across devices", () => {
  const base = createInitialWorkspace();
  const choices = agendaSubjects(base);
  expect(choices.map((choice) => choice.label)).toEqual(
    PRACTICE_ISLANDS.map((island) => island.subject),
  );
  expect(choices[0]?.value).toBe("subject-english");
  expect(agendaSubjectName(base, "subject-english")).toBe("Idiomas");
  const math = choices.find((choice) => choice.label === "Matemática")!;
  const action = {
    type: "subject/added" as const,
    id: math.value,
    name: math.label,
    color: "#7c3aed",
  };
  const local = workspaceReducer(base, action),
    remote = workspaceReducer(base, action);
  expect(workspaceReducer(local, action)).toBe(local);
  expect(
    mergeWorkspaceStates(base, local, remote).workspace.subjects.filter(
      (subject) => subject.id === math.value,
    ),
  ).toHaveLength(1);
});

it("usa a mesma paleta no planejador e no painel, respeitando a cor escolhida", () => {
  expect(agendaItemColor({})).toBe("#38a4ad");
  expect(agendaItemColor({ kind: "study" })).toBe("#a779ef");
  expect(agendaItemColor({ kind: "appointment" })).toBe("#facc15");
  expect(agendaItemColor({ kind: "study", color: "#ef476f" })).toBe("#ef476f");
});
