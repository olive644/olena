import { PRACTICE_ISLANDS } from "../data/practice-islands";
import { type WorkspaceState } from "./workspace";

export function agendaSubjects(workspace: WorkspaceState) {
  return PRACTICE_ISLANDS.map((island) => {
    const existing = workspace.subjects.find(
      (subject) =>
        subject.name.trim().toLocaleLowerCase("pt-BR") ===
          island.subject.toLocaleLowerCase("pt-BR") ||
        (island.id === "languages" && subject.id === "subject-english"),
    );
    return { value: existing?.id ?? `subject-island-${island.id}`, label: island.subject };
  });
}
