import { dateForKey, shiftDate } from "./agenda";
import { type AgendaRange } from "./agenda-history";
import { toDateKey, type FocusSession, type WorkspaceState } from "./workspace";
import { MATH_COURSES, type MathCourseId, type MathProgress } from "../data/math-courses";

export type AgendaCategory = "timer" | "notes" | "pomodoro" | "islands";
export type ChartItem = { label: string; value: number };
export function agendaDashboard(
  workspace: WorkspaceState,
  range: AgendaRange,
  category: AgendaCategory,
  progress: Partial<Record<MathCourseId, MathProgress>> = {},
  sessions: FocusSession[] = workspace.focusSessions,
) {
  const inside = (date: string) => date >= range.start && date <= range.end;
  const valid = sessions.filter(
    (session) =>
      Number.isFinite(new Date(session.completedAt).getTime()) &&
      Number.isFinite(session.durationMinutes) &&
      session.durationMinutes > 0,
  );
  const legacy = valid.filter(
    (session) => !session.mode && inside(toDateKey(new Date(session.completedAt))),
  ).length;
  if (category === "islands") {
    const bars = MATH_COURSES.map((course) => ({
      label: course.subject,
      value: progress[course.id]?.correct ?? 0,
    }));
    return {
      bars,
      pie: [
        ...bars.slice(0, 4),
        { label: "Outras ilhas", value: bars.slice(4).reduce((sum, item) => sum + item.value, 0) },
      ],
      unit: "acertos",
      barTitle: "Acertos por ilha",
      pieTitle: "Distribuição entre ilhas",
      note: "Progresso acumulado das ilhas, sem filtro de datas.",
      legacy: 0,
    };
  }
  const daily = new Map<string, number>();
  const subjects = new Map<string, number>();
  const record = (date: string, subjectId: string, amount: number) => {
    if (!inside(date)) return;
    daily.set(date, (daily.get(date) ?? 0) + amount);
    const label =
      workspace.subjects.find((subject) => subject.id === subjectId)?.name ?? "Sem matéria";
    subjects.set(label, (subjects.get(label) ?? 0) + amount);
  };
  if (category === "notes") {
    for (const notebook of workspace.notebooks) {
      if (notebook.kind === "folder" || notebook.kind === "collection") continue;
      const date = new Date(notebook.createdAt);
      if (Number.isFinite(date.getTime())) record(toDateKey(date), notebook.subjectId, 1);
    }
  } else {
    for (const session of valid)
      if (session.mode === category)
        record(
          toDateKey(new Date(session.completedAt)),
          session.subjectId,
          session.durationMinutes,
        );
  }
  const dates: string[] = [];
  for (let date = range.start; date <= range.end; date = shiftDate(date, 1)) dates.push(date);
  const size = Math.max(1, Math.ceil(dates.length / 7));
  const bars: ChartItem[] = [];
  for (let index = 0; index < dates.length; index += size) {
    const group = dates.slice(index, index + size);
    const label = (date: string) =>
      `${dateForKey(date).getDate()}/${dateForKey(date).getMonth() + 1}`;
    bars.push({
      label:
        group.length === 1 ? label(group[0]!) : `${label(group[0]!)} a ${label(group.at(-1)!)}`,
      value: group.reduce((sum, date) => sum + (daily.get(date) ?? 0), 0),
    });
  }
  const ranked = [...subjects]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const pie = ranked.slice(0, 4);
  if (ranked.length > 4)
    pie.push({
      label: "Outras",
      value: ranked.slice(4).reduce((sum, item) => sum + item.value, 0),
    });
  return {
    bars,
    pie,
    unit: category === "notes" ? "cadernos" : "min",
    barTitle: category === "notes" ? "Cadernos criados" : "Minutos por período",
    pieTitle: "Por matéria",
    note:
      category === "notes"
        ? "Criação de cadernos no intervalo, não tempo de escrita."
        : "Sessões com modalidade registrada no intervalo.",
    legacy: category === "notes" ? 0 : legacy,
  };
}
