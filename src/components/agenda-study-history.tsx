import { dateForKey } from "../domain/agenda";
import { historySummary, type AgendaRange, type focusHistory } from "../domain/agenda-history";
import { type WorkspaceState } from "../domain/workspace";

export function AgendaStudyHistory({
  history,
  range,
  selected,
  workspace,
}: {
  history: ReturnType<typeof focusHistory>;
  range: AgendaRange;
  selected: string;
  workspace: WorkspaceState;
}) {
  const summary = historySummary(history, range);
  const sessions = history.get(selected)?.sessions ?? [];
  const label = (date: string) =>
    dateForKey(date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  return (
    <section className="agenda-history module-panel" aria-label="Histórico de estudo">
      <header>
        <h2>Seu ritmo</h2>
        <span>
          {range.start === range.end
            ? label(range.start)
            : `${label(range.start)} a ${label(range.end)}`}
        </span>
      </header>
      <dl className="agenda-history-stats" aria-live="polite">
        <div>
          <dt>Minutos de foco</dt>
          <dd>{summary.minutes}</dd>
        </div>
        <div>
          <dt>Dias estudados</dt>
          <dd>{summary.days}</dd>
        </div>
        <div>
          <dt>Maior sequência</dt>
          <dd>
            {summary.longest}
            <small>{summary.longest === 1 ? " dia" : " dias"}</small>
          </dd>
        </div>
      </dl>
      <h3>Horários de registro · {label(selected)}</h3>
      <div className="agenda-record-rail" aria-hidden="true">
        {sessions.map((session) => {
          const time = new Date(session.completedAt);
          return (
            <span
              key={session.id}
              style={{ left: `${((time.getHours() * 60 + time.getMinutes()) / 1440) * 100}%` }}
            />
          );
        })}
      </div>
      <div className="agenda-record-hours" aria-hidden="true">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>24h</span>
      </div>
      {sessions.length === 0 ? (
        <p>Nenhum estudo registrado neste dia.</p>
      ) : (
        <ul className="agenda-records">
          {sessions.map((session) => (
            <li key={session.id}>
              <time dateTime={session.completedAt}>
                {new Date(session.completedAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <span>
                {workspace.subjects.find((subject) => subject.id === session.subjectId)?.name ??
                  "Matéria removida"}
              </span>
              <strong>{session.durationMinutes} min</strong>
            </li>
          ))}
        </ul>
      )}
      <small className="agenda-history-note">
        Minutos registrados no Foco. A linha indica a conclusão, não o início da sessão.
      </small>
    </section>
  );
}
