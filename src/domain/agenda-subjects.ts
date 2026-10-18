import { PRACTICE_ISLANDS } from "../data/practice-islands";
import { type WorkspaceState } from "./workspace";
import { uiText } from "../i18n/runtime";

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

export function agendaSubjectName(workspace: WorkspaceState, id: string) {
  return (
    agendaSubjects(workspace).find((subject) => subject.value === id)?.label ??
    workspace.subjects.find((subject) => subject.id === id)?.name ??
    uiText(2278)
  );
}

export function agendaItemColor(item: { color?: string; kind?: string }) {
  return item.color ?? (item.kind === "study" ? "#a779ef" : item.kind ? "#facc15" : "#38a4ad");
}
