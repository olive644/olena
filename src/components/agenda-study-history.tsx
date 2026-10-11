import { dateForKey } from "../domain/agenda";
import { historySummary, type AgendaRange, type focusHistory } from "../domain/agenda-history";
import { type WorkspaceState } from "../domain/workspace";
import { type AppView } from "./app-navigation";
import { NavigationIcon } from "./navigation-icon";
import { PaperDigits } from "./paper-digits";

function RangeDate({ date }: { date: string }) {
  const value = dateForKey(date);
  return (
    <>
      <PaperDigits value={String(value.getDate())} />{" "}
      {value.toLocaleDateString("pt-BR", { month: "short" })}
    </>
  );
}

export function AgendaStudyHistory({
  history,
  range,
  workspace,
  onNavigate,
}: {
  history: ReturnType<typeof focusHistory>;
  range: AgendaRange;
  workspace: WorkspaceState;
  onNavigate?: (view: AppView) => void;
}) {
  const summary = historySummary(history, range);
  return (
    <section className="agenda-history module-panel" aria-label="Histórico de estudo">
      <header>
        <h2>Meu estudo</h2>
        <span>
          <RangeDate date={range.start} />
          {range.start !== range.end && (
            <>
              {" "}
              a <RangeDate date={range.end} />
            </>
          )}
        </span>
      </header>
      <div className="agenda-dashboard">
        <button
          type="button"
          className="secondary-button"
          onClick={() => onNavigate?.("focus")}
          disabled={!onNavigate}
        >
          <NavigationIcon name="focus" />
          <span>
            <strong>Cronômetro</strong>
            <span>
              <PaperDigits value={String(summary.minutes)} /> min de foco
            </span>
          </span>
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onNavigate?.("notes")}
          disabled={!onNavigate}
        >
          <NavigationIcon name="notes" />
          <span>
            <strong>Caderno</strong>
            <span>
              <PaperDigits value={String(workspace.notebooks.length)} /> na biblioteca
            </span>
          </span>
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onNavigate?.("focus")}
          disabled={!onNavigate}
        >
          <svg className="agenda-pomodoro-icon" viewBox="0 0 280 290" aria-hidden="true">
            <path
              fill="#963a50"
              d="m140 85-32-11-35 9-29 23-17 34 1 41 17 36 30 29 65 15 65-15 30-29 17-36 1-41-17-34-29-23-35-9Z"
            />
            <path
              fill="#e55670"
              d="m140 78-32-11-35 9-29 23-17 34 1 41 17 36 30 29 65 15 65-15 30-29 17-36 1-41-17-34-29-23-35-9Z"
            />
            <path fill="#ffadbc" d="m31 128 20-29 33-17-21 27Z M191 239l32-31 15-35-2 37-29 28Z" />
            <path
              fill="#38a4ad"
              d="m140 66-35-20 9 25-43 9 42 13-15 25 42-24 39 24-13-26 44-12-42-9 8-25Z"
            />
            <path fill="#216970" d="m140 78-42 40 42-24 39 24-13-26 44-12-48 3 14-37Z" />
          </svg>
          <span>
            <strong>Pomodoro</strong>
            <span>
              Ciclo de <PaperDigits value={String(workspace.focusPreferences.pomodoroMinutes)} />{" "}
              min
            </span>
          </span>
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onNavigate?.("learn")}
          disabled={!onNavigate}
        >
          <img
            className="agenda-island-icon"
            src="/practice-islands/mathematics-small.webp"
            alt=""
            draggable={false}
          />
          <span>
            <strong>Ilhas</strong>
            <span>Explorar Matemática</span>
          </span>
        </button>
      </div>
      <dl className="agenda-history-stats" aria-live="polite">
        <div>
          <dt>Minutos no intervalo</dt>
          <dd>
            <PaperDigits value={String(summary.minutes)} />
          </dd>
        </div>
        <div>
          <dt>Dias estudados</dt>
          <dd>
            <PaperDigits value={String(summary.days)} />
          </dd>
        </div>
        <div>
          <dt>Maior sequência</dt>
          <dd>
            <PaperDigits value={String(summary.longest)} />
            <small>{summary.longest === 1 ? " dia" : " dias"}</small>
          </dd>
        </div>
      </dl>
    </section>
  );
}
