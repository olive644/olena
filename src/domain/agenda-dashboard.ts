import { dateForKey, shiftDate } from "./agenda";
import { type AgendaRange } from "./agenda-history";
import { toDateKey, type FocusSession, type WorkspaceState } from "./workspace";
import { uiText, uiLocale } from "../i18n/runtime";

export type AgendaCategory = "timer" | "notes" | "pomodoro" | "islands";
export type ChartItem = { label: string; value: number };
export function agendaDashboard(
  workspace: WorkspaceState,
  range: AgendaRange,
  category: AgendaCategory,
  sessions: FocusSession[] = workspace.focusSessions,
) {
  const inside = (date: string) => date >= range.start && date <= range.end;
  const shortDate = (date: string) => {
    const value = dateForKey(date);
    return uiLocale() === "en-US"
      ? `${value.getMonth() + 1}/${value.getDate()}`
      : `${value.getDate()}/${value.getMonth() + 1}`;
  };
  const valid = sessions.filter(
    (session) =>
      Number.isFinite(new Date(session.completedAt).getTime()) &&
      Number.isFinite(session.durationMinutes) &&
      session.durationMinutes > 0,
  );
  const legacy = valid.filter(
    (session) => !session.mode && inside(toDateKey(new Date(session.completedAt))),
  ).length;
  const daily = new Map<string, number>();
  const subjects = new Map<string, number>();
  const entries: { id: string; title: string; label: string; date: string }[] = [];
  const record = (date: string, label: string, amount: number) => {
    if (!inside(date)) return;
    daily.set(date, (daily.get(date) ?? 0) + amount);
    subjects.set(label, (subjects.get(label) ?? 0) + amount);
  };
  if (category === "islands") {
    for (const activity of workspace.practiceActivities ?? []) {
      if (!Number.isFinite(new Date(activity.completedAt).getTime()) || activity.answers <= 0)
        continue;
      const date = toDateKey(new Date(activity.completedAt));
      if (!inside(date)) continue;
      daily.set(date, (daily.get(date) ?? 0) + activity.answers);
      const islandName = uiText(activity.islandName);
      subjects.set(islandName, (subjects.get(islandName) ?? 0) + activity.answers);
    }
  } else if (category === "notes") {
    for (const notebook of workspace.notebooks) {
      const date = new Date(notebook.createdAt);
      if (!Number.isFinite(date.getTime()) || !inside(toDateKey(date))) continue;
      const label =
        notebook.kind === "note" ? "Notes" : uiText(notebook.kind ? "Pastas" : "Cadernos");
      record(toDateKey(date), label, 1);
      entries.push({ id: notebook.id, title: notebook.title, label, date: toDateKey(date) });
    }
  } else {
    for (const session of valid)
      if (session.mode === category)
        record(
          toDateKey(new Date(session.completedAt)),
          shortDate(toDateKey(new Date(session.completedAt))),
          session.durationMinutes,
        );
  }
  const dates: string[] = [];
  for (let date = range.start; date <= range.end; date = shiftDate(date, 1)) dates.push(date);
  const size = Math.max(1, Math.ceil(dates.length / 7));
  const bars: ChartItem[] = [];
  for (let index = 0; index < dates.length; index += size) {
    const group = dates.slice(index, index + size);
    const label = shortDate;
    bars.push({
      label:
        group.length === 1
          ? label(group[0]!)
          : `${label(group[0]!)} ${uiText(97)} ${label(group.at(-1)!)}`,
      value: group.reduce((sum, date) => sum + (daily.get(date) ?? 0), 0),
    });
  }
  const ranked = [...subjects]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const pie = ranked.slice(0, 4);
  if (ranked.length > 4)
    pie.push({
      label: uiText(2593),
      value: ranked.slice(4).reduce((sum, item) => sum + item.value, 0),
    });
  return {
    entries,
    bars,
    pie,
    unit: uiText(category === "notes" ? "itens" : category === "islands" ? "respostas" : "min"),
    barTitle: uiText(
      category === "notes"
        ? "Criações na estante"
        : category === "islands"
          ? "Respostas por período"
          : "Minutos por período",
    ),
    pieTitle: uiText(
      category === "islands" ? "Por ilha" : category === "notes" ? "Tipos na estante" : "Por dia",
    ),
    note: uiText(
      category === "islands"
        ? "Atividades registradas por dia. Progresso antigo sem data não entra no filtro."
        : category === "notes"
          ? "Cadernos, pastas e Notes criados no período. Não mede tempo de escrita."
          : "Sessões com modalidade registrada no intervalo.",
    ),
    legacy: category === "notes" || category === "islands" ? 0 : legacy,
  };
}
