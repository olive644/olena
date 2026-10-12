import { toDateKey, type StudyEvent, type WorkspaceState } from "./workspace";
import { displayEventsOn, occurrenceOn } from "./agenda-calendar";

export const HELENA_PLAN_DRAFT_EVENT = "olena:helena-plan-draft";
export function dateForKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}
export function shiftDate(key: string, days: number): string {
  const date = dateForKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}
export function weekDates(key: string): string[] {
  const first = shiftDate(key, -((dateForKey(key).getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => shiftDate(first, index));
}
export function monthDates(key: string): string[] {
  const date = dateForKey(key);
  date.setDate(1);
  const first = weekDates(toDateKey(date))[0]!;
  return Array.from({ length: 42 }, (_, index) => shiftDate(first, index));
}
export function eventOccursOn(event: StudyEvent, date: string): boolean {
  return occurrenceOn(event, date) !== null;
}
export function eventsOn(workspace: Pick<WorkspaceState, "events">, date: string): StudyEvent[] {
  const orderedIds = [...new Set(displayEventsOn(workspace.events, date).map((event) => event.id))];
  const originals = new Map(workspace.events.map((event) => [event.id, event]));
  return orderedIds.flatMap((id) => (originals.get(id) ? [originals.get(id)!] : []));
}
export function overdueTasks(workspace: WorkspaceState, today: string) {
  return workspace.tasks.filter((task) => {
    if (task.completed || !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) || task.dueDate >= today)
      return false;
    const date = dateForKey(task.dueDate);
    return Number.isFinite(date.getTime()) && toDateKey(date) === task.dueDate;
  });
}
export function agendaPrompt(workspace: WorkspaceState, date: string): string {
  const days = weekDates(date).map(
    (day) =>
      `${day}: ${
        eventsOn(workspace, day)
          .map((event) => `${event.time} ${event.title} (${event.durationMinutes ?? 30} min)`)
          .join(", ") || "sem compromissos"
      }`,
  );
  const pending = workspace.tasks
    .filter((task) => !task.completed)
    .slice(0, 8)
    .map((task) => `${task.title}, prazo ${task.dueDate}`);
  return `Me ajude a planejar estudos curtos e revisões nesta semana. Não altere minha agenda. Sugira horários sem conflito e explique suas escolhas para eu confirmar.\nSemana:\n${days.join("\n")}\nPendências: ${pending.join("; ") || "nenhuma"}`.slice(
    0,
    2000,
  );
}
