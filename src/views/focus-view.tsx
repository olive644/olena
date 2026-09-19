import { Check, Plus } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type FormEvent,
} from "react";
import { PageHeader } from "../components/app-navigation";
import {
  minutesFocusedOn,
  minutesFocusedForSubject,
  toDateKey,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";

type FocusViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
};

const FULL_BLOOM_MINUTES = 60;
const POMODORO_SHORT_BREAK_MINUTES = 5;
const POMODORO_LONG_BREAK_MINUTES = 15;
const POMODORO_STREAK_KEY = "noteoli.pomodoro-streak.v1";
const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;
type TimerMode = "timer" | "pomodoro";
type PomodoroPhase = "focus" | "shortBreak" | "longBreak";

export function nextPomodoroStep(
  phase: PomodoroPhase,
  completed: number,
  longBreaks = true,
  focusMinutes: 25 | 50 = 25,
) {
  if (phase === "focus") {
    const nextCompleted = completed + 1;
    const longBreak = longBreaks && nextCompleted % 4 === 0;
    return {
      phase: longBreak ? ("longBreak" as const) : ("shortBreak" as const),
      duration: longBreak ? POMODORO_LONG_BREAK_MINUTES : POMODORO_SHORT_BREAK_MINUTES,
      completed: nextCompleted,
    };
  }
  return { phase: "focus" as const, duration: focusMinutes, completed };
}

function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function calendarDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatStopwatch(totalMilliseconds: number): string {
  const seconds = Math.floor(totalMilliseconds / 1000) % 60;
  const minutes = Math.floor(totalMilliseconds / 60000) % 60;
  const hours = Math.floor(totalMilliseconds / 3600000);
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function weekDays(reference = new Date()) {
  const monday = new Date(reference);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(reference.getDate() - ((reference.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { key: toDateKey(date), label: "STQQSSD"[index] };
  });
}

function FocusRose({ progress, wilted }: { progress: number; wilted: boolean }) {
  return (
    <svg
      className={`focus-rose${wilted ? " is-wilted" : ""}`}
      viewBox="0 0 300 330"
      role="img"
      aria-label={wilted ? "Rosa de foco murcha" : "Rosa de foco crescendo"}
      style={{ "--rose-growth": String(0.85 + progress * 0.15) } as CSSProperties}
    >
      <path
        className="focus-rose__dome-back"
        d="M45 262V141C45 67 89 25 150 25s105 42 105 116v121Z"
      />
      <path className="focus-rose__shadow" d="m82 263 69-18 67 20-67 16Z" />
      <g transform="translate(25 35)">
        <g className="focus-rose__plant">
          <path className="focus-rose__stem-shadow" d="m118 211 15-116 13 3-13 116Z" />
          <path className="focus-rose__stem" d="m111 211 14-118 12 4-13 117Z" />
          <path
            className="focus-rose__leaf focus-rose__leaf--left"
            d="m119 164-56-39 10 48 45 17Z"
          />
          <path
            className="focus-rose__leaf-fold focus-rose__leaf-fold--left"
            d="m63 125 56 39-46 9Z"
          />
          <path
            className="focus-rose__leaf focus-rose__leaf--right"
            d="m130 143 53-38-9 48-45 18Z"
          />
          <path
            className="focus-rose__leaf-fold focus-rose__leaf-fold--right"
            d="m183 105-53 38 44 10Z"
          />
          <g className="focus-rose__bloom">
            <path
              className="focus-rose__petal focus-rose__petal--back"
              d="m72 77 22-43 37 27 30-36 19 47-26 28-51 2Z"
            />
            <path
              className="focus-rose__petal focus-rose__petal--left"
              d="m67 74 45-18 12 47-35 25-28-29Z"
            />
            <path
              className="focus-rose__petal focus-rose__petal--right"
              d="m124 57 43 8 22 34-31 31-39-27Z"
            />
            <path
              className="focus-rose__petal focus-rose__petal--front"
              d="m89 82 37-24 35 27-7 42-47 5-25-28Z"
            />
            <path className="focus-rose__petal-fold" d="m89 82 37 20 35-17-35-27Z" />
            <path className="focus-rose__center" d="m107 82 20-11 20 14-7 24-25-2Z" />
          </g>
        </g>
      </g>
      <path
        className="focus-rose__dome-glass"
        d="M45 262V141C45 67 89 25 150 25s105 42 105 116v121"
      />
      <path className="focus-rose__dome-shine" d="M73 210v-66c0-47 18-79 49-94" />
      <path className="focus-rose__base-depth" d="m29 272 19-18h205l19 18-18 31H48Z" />
      <path className="focus-rose__base" d="m25 264 23-18h205l22 18-20 28H46Z" />
      <path className="focus-rose__base-fold" d="m25 264 23-18h205l-19 18Z" />
    </svg>
  );
}

function PomodoroTomato({ progress }: { progress: number }) {
  const outline =
    "m140 78-32-11-35 9-29 23-17 34 1 41 17 36 30 29 65 15 65-15 30-29 17-36 1-41-17-34-29-23-35-9Z";
  const eaten = 1 - Math.max(0, Math.min(1, progress));
  return (
    <svg
      className="pomodoro-tomato"
      viewBox="0 0 280 290"
      role="img"
      aria-label="Tomate Pomodoro em papel recortado"
    >
      <defs>
        <mask id="pomodoro-bites">
          <rect width="280" height="290" fill="white" />
          <path
            className="pomodoro-tomato__bites"
            d="m258 108-23 24 24 24-23 24 12 23-24 21-26 18-31 15"
            pathLength="100"
            strokeDasharray={`${eaten * 100} 100`}
          />
        </mask>
      </defs>
      <g mask="url(#pomodoro-bites)">
        <path className="pomodoro-tomato__depth" d={outline} transform="translate(0 7)" />
        <path className="pomodoro-tomato__track" d={outline} />
        <path className="pomodoro-tomato__progress" d={outline} />
        <path
          className="pomodoro-tomato__facet"
          d="m31 128 20-29 33-17-21 27Z M191 239l32-31 15-35-2 37-29 28Z"
        />
      </g>
      <path
        className="pomodoro-tomato__leaf"
        d="m140 66-35-20 9 25-43 9 42 13-15 25 42-24 39 24-13-26 44-12-42-9 8-25Z"
      />
      <path
        className="pomodoro-tomato__leaf-fold"
        d="m140 78-42 40 42-24 39 24-13-26 44-12-48 3 14-37Z"
      />
    </svg>
  );
}

function FocusPaperArrow() {
  return (
    <svg className="focus-paper-arrow" viewBox="0 0 48 48" aria-hidden="true">
      <path className="focus-paper-arrow__depth" d="m7 25 21-20 14 8-12 12 11 10-14 8Z" />
      <path className="focus-paper-arrow__face" d="m5 21 23-18 12 8-13 11 12 10-13 8Z" />
      <path className="focus-paper-arrow__fold" d="m5 21 22 1 13-11-12-8Z" />
    </svg>
  );
}

function FocusPaperControlIcon({ paused }: { paused: boolean }) {
  return (
    <svg
      className={`focus-paper-control-icon ${paused ? "is-pause" : "is-play"}`}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path className="focus-paper-control-icon__depth" d="M7 7 42 25 9 44Z" />
      {paused ? (
        <>
          <path className="focus-paper-control-icon__face" d="m8 5 14 4-2 33-13-2Z" />
          <path className="focus-paper-control-icon__face" d="m27 8 14-3-1 35-13 3Z" />
          <path className="focus-paper-control-icon__fold" d="m8 5 14 4-6 6-8-2Z" />
        </>
      ) : (
        <>
          <path className="focus-paper-control-icon__face" d="M5 4 40 22 7 41Z" />
          <path className="focus-paper-control-icon__fold" d="m5 4 35 18-21 1Z" />
        </>
      )}
    </svg>
  );
}

export function FocusView({ workspace, dispatch }: FocusViewProps) {
  const defaultSubject = workspace.subjects[0];
  const [mode, setMode] = useState<TimerMode>("timer");
  const [modeDirection, setModeDirection] = useState(1);
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>("focus");
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [duration, setDuration] = useState<number>(workspace.focusPreferences.pomodoroMinutes);
  const [secondsRemaining, setSecondsRemaining] = useState(duration * 60);
  const [timerElapsedMilliseconds, setTimerElapsedMilliseconds] = useState(0);
  const timerStartedAt = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [pomodoroDays, setPomodoroDays] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(POMODORO_STREAK_KEY) ?? "[]") as string[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    document.body.classList.add("focus-page-active");
    return () => document.body.classList.remove("focus-page-active");
  }, []);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalAmount, setGoalAmount] = useState(300);
  const [deadline, setDeadline] = useState(toDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => dateFromKey(deadline));
  const [openedAt] = useState(() => Date.now());
  const pomodoroElapsedSeconds = duration * 60 - secondsRemaining;
  const elapsedSeconds =
    mode === "timer" ? Math.floor(timerElapsedMilliseconds / 1000) : pomodoroElapsedSeconds;

  useEffect(() => {
    if (!running || mode !== "timer") return;
    timerStartedAt.current ??= Date.now() - timerElapsedMilliseconds;
    const timer = window.setInterval(() => {
      setTimerElapsedMilliseconds(Date.now() - (timerStartedAt.current ?? Date.now()));
    }, 10);
    return () => window.clearInterval(timer);
  }, [mode, running, timerElapsedMilliseconds]);

  useEffect(() => {
    if (!running || mode !== "pomodoro") return;
    const timer = window.setTimeout(() => {
      if (secondsRemaining > 1) {
        setSecondsRemaining(secondsRemaining - 1);
        return;
      }
      if (pomodoroPhase === "focus") {
        dispatch({
          type: "focus/recorded",
          subjectId: defaultSubject?.id ?? "",
          durationMinutes: duration,
          completedAt: new Date().toISOString(),
        });
        const today = toDateKey(new Date());
        setPomodoroDays((current) => {
          const nextDays = current.includes(today) ? current : [...current, today];
          localStorage.setItem(POMODORO_STREAK_KEY, JSON.stringify(nextDays));
          return nextDays;
        });
      }
      const next = nextPomodoroStep(
        pomodoroPhase,
        completedPomodoros,
        workspace.focusPreferences.longBreaks,
        workspace.focusPreferences.pomodoroMinutes,
      );
      setPomodoroPhase(next.phase);
      setCompletedPomodoros(next.completed);
      setDuration(next.duration);
      setSecondsRemaining(next.duration * 60);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [
    completedPomodoros,
    defaultSubject?.id,
    dispatch,
    duration,
    mode,
    pomodoroPhase,
    running,
    secondsRemaining,
    workspace.focusPreferences.longBreaks,
    workspace.focusPreferences.pomodoroMinutes,
  ]);

  if (!defaultSubject) return null;
  const subject = defaultSubject;

  function chooseDuration(minutes: number) {
    setDuration(minutes);
    setSecondsRemaining(minutes * 60);
    setRunning(false);
  }

  function chooseMode(nextMode: TimerMode) {
    setMode(nextMode);
    setPomodoroPhase("focus");
    setCompletedPomodoros(0);
    setGoalAmount(nextMode === "pomodoro" ? 4 : 300);
    chooseDuration(workspace.focusPreferences.pomodoroMinutes);
    setTimerElapsedMilliseconds(0);
    timerStartedAt.current = null;
  }

  function slideMode(direction: -1 | 1) {
    setModeDirection(direction);
    chooseMode(mode === "timer" ? "pomodoro" : "timer");
  }

  function reset() {
    setRunning(false);
    if (mode === "timer") {
      setTimerElapsedMilliseconds(0);
      timerStartedAt.current = null;
    } else {
      setSecondsRemaining(duration * 60);
    }
  }

  function toggleRunning() {
    setRunning((current) => {
      const next = !current;
      timerStartedAt.current = next ? Date.now() - timerElapsedMilliseconds : null;
      return next;
    });
  }

  function finish() {
    if (elapsedSeconds <= 0) return;
    if (mode === "timer" || pomodoroPhase === "focus") {
      dispatch({
        type: "focus/recorded",
        subjectId: subject.id,
        durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
        completedAt: new Date().toISOString(),
      });
    }
    reset();
  }

  const todayMinutes = minutesFocusedOn(workspace, toDateKey(new Date()));
  const liveMinutes = elapsedSeconds / 60;
  const bloomProgress = Math.min(1, (todayMinutes + liveMinutes) / FULL_BLOOM_MINUTES);
  const lastSession = workspace.focusSessions.reduce<Date | null>((latest, session) => {
    const completedAt = new Date(session.completedAt);
    return !latest || completedAt > latest ? completedAt : latest;
  }, null);
  const caredToday = todayMinutes > 0;
  const missedYesterday = Boolean(
    lastSession && openedAt - lastSession.getTime() >= 2 * 24 * 60 * 60 * 1000,
  );
  const focusedMinutes = minutesFocusedForSubject(workspace, subject.id);
  const subjectGoals = workspace.goals.filter((goal) => goal.subjectId === subject.id);

  function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = goalTitle.trim();
    if (!title) return;
    const targetMinutes =
      mode === "pomodoro" ? goalAmount * workspace.focusPreferences.pomodoroMinutes : goalAmount;
    dispatch({ type: "goal/added", subjectId: subject.id, title, targetMinutes, deadline });
    setGoalTitle("");
  }

  const todayKey = toDateKey(new Date());
  const selectedDeadline = dateFromKey(deadline);
  const days = calendarDays(calendarMonth);

  return (
    <main className="main-content focus-page" id="main-content">
      <PageHeader />
      <div className="focus-layout">
        <section className="focus-card" aria-labelledby="focus-timer-title">
          <div className="focus-mode-carousel">
            <button
              className="focus-mode-arrow focus-mode-arrow--previous"
              type="button"
              disabled={running || elapsedSeconds > 0}
              onClick={() => slideMode(-1)}
              aria-label="Modo anterior"
            >
              <FocusPaperArrow />
            </button>
            <div className="focus-mode-viewport">
              <span className="focus-mode-name" aria-live="polite">
                {mode === "timer" ? "Cronômetro" : "Pomodoro"}
              </span>
              <div
                className={`focus-mode-slide${modeDirection < 0 ? " is-backward" : ""}`}
                key={mode}
              >
                <div
                  className={`focus-rose-stage${mode === "pomodoro" ? " focus-rose-stage--pomodoro" : ""}`}
                >
                  {mode === "timer" ? (
                    <FocusRose progress={bloomProgress} wilted={missedYesterday && !caredToday} />
                  ) : (
                    <div className="pomodoro-dial">
                      <PomodoroTomato progress={secondsRemaining / (duration * 60)} />
                      <div className="pomodoro-dial__time">
                        <h2 id="focus-timer-title" className="timer">
                          {formatTimer(secondsRemaining)}
                        </h2>
                        {pomodoroPhase !== "focus" && <p>Respire um pouco</p>}
                      </div>
                    </div>
                  )}
                  <div className="focus-rose-copy">
                    <span>
                      {mode === "pomodoro"
                        ? pomodoroPhase === "longBreak"
                          ? "Pausa longa"
                          : pomodoroPhase === "shortBreak"
                            ? "Pausa curta"
                            : ""
                        : caredToday
                          ? "Cuidada hoje"
                          : "Sua flor de foco"}
                    </span>
                    <strong>
                      {mode === "pomodoro"
                        ? pomodoroPhase === "longBreak"
                          ? "Você completou quatro rodadas. Descanse por 15 minutos."
                          : pomodoroPhase === "shortBreak"
                            ? "Respire por 5 minutos. O próximo ciclo começa sozinho."
                            : ""
                        : missedYesterday && !caredToday
                          ? "Ela sentiu sua falta. Uma sessão faz a rosa florescer novamente."
                          : caredToday
                            ? "Ela está segura por hoje. Continue para vê-la crescer."
                            : "Comece uma sessão hoje para manter a rosa viva."}
                    </strong>
                    {mode === "timer" ? (
                      <small>
                        {Math.min(FULL_BLOOM_MINUTES, Math.floor(todayMinutes + liveMinutes))}/
                        {FULL_BLOOM_MINUTES} min até florescer por completo
                      </small>
                    ) : (
                      <div className="pomodoro-progress">
                        <span>Pomodoros concluídos nesta semana</span>
                        <div className="pomodoro-week">
                          {weekDays().map((day) => (
                            <span className="pomodoro-week__day" key={day.key}>
                              <i
                                className={`streak-tomato${pomodoroDays.includes(day.key) ? " is-active" : ""}`}
                                aria-hidden="true"
                              />
                              <small>{day.label}</small>
                            </span>
                          ))}
                        </div>
                        <small>
                          {workspace.focusPreferences.pomodoroMinutes} min de foco · 5 min de pausa
                          {workspace.focusPreferences.longBreaks
                            ? " · 15 min após quatro rodadas"
                            : " · sem pausa longa"}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
                {mode === "timer" && (
                  <h2 id="focus-timer-title" className="timer timer--stopwatch" aria-live="off">
                    {formatStopwatch(timerElapsedMilliseconds)}
                  </h2>
                )}
                <div className="timer-controls">
                  <button
                    className="primary-button timer-primary"
                    type="button"
                    onClick={toggleRunning}
                  >
                    <FocusPaperControlIcon paused={running} />
                    {running ? "Pausar" : elapsedSeconds > 0 ? "Continuar" : "Começar"}
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={reset}
                    aria-label="Reiniciar contador"
                  >
                    ↺
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={finish}
                    disabled={elapsedSeconds <= 0}
                  >
                    Encerrar e registrar
                  </button>
                </div>
              </div>
            </div>
            <button
              className="focus-mode-arrow focus-mode-arrow--next"
              type="button"
              disabled={running || elapsedSeconds > 0}
              onClick={() => slideMode(1)}
              aria-label="Próximo modo"
            >
              <FocusPaperArrow />
            </button>
          </div>
        </section>
      </div>

      <div className="learn-grid focus-goals focus-goals--hidden" style={{ display: "none" }}>
        <section className="module-panel" aria-labelledby="new-goal-title">
          <div className="module-heading">
            <h2 id="new-goal-title">Nova meta de foco</h2>
          </div>
          <form className="compact-form" onSubmit={addGoal}>
            <label className="field">
              <span>Objetivo</span>
              <input
                value={goalTitle}
                onChange={(event) => setGoalTitle(event.target.value)}
                placeholder="Ex.: Preparar prova final"
                required
              />
            </label>
            <div className="focus-goal-grid">
              <label className="field focus-goal-amount">
                <span>{mode === "pomodoro" ? "Meta em pomodoros" : "Meta em minutos"}</span>
                <input
                  type="number"
                  min="1"
                  step={mode === "pomodoro" ? 1 : 5}
                  value={goalAmount}
                  onChange={(event) => setGoalAmount(Number(event.target.value))}
                  required
                />
              </label>
              <div className="paper-calendar" aria-label="Escolha o prazo">
                <div className="paper-calendar__heading">
                  <button
                    type="button"
                    aria-label="Mês anterior"
                    onClick={() =>
                      setCalendarMonth(
                        new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
                      )
                    }
                  >
                    ‹
                  </button>
                  <strong>
                    {MONTH_NAMES[calendarMonth.getMonth()]} de {calendarMonth.getFullYear()}
                  </strong>
                  <button
                    type="button"
                    aria-label="Próximo mês"
                    onClick={() =>
                      setCalendarMonth(
                        new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
                      )
                    }
                  >
                    ›
                  </button>
                </div>
                <div className="paper-calendar__week" aria-hidden="true">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
                    <span key={`${day}-${index}`}>{day}</span>
                  ))}
                </div>
                <div className="paper-calendar__days">
                  {days.map((date) => {
                    const dateKey = toDateKey(date);
                    const outside = date.getMonth() !== calendarMonth.getMonth();
                    const inRange = dateKey >= todayKey && dateKey <= deadline;
                    return (
                      <button
                        className={`${outside ? "is-outside " : ""}${inRange ? "is-in-range " : ""}${dateKey === todayKey ? "is-start " : ""}${dateKey === deadline ? "is-end" : ""}`}
                        type="button"
                        disabled={dateKey < todayKey}
                        aria-label={date.toLocaleDateString("pt-BR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        aria-pressed={dateKey === deadline}
                        onClick={() => setDeadline(dateKey)}
                        key={dateKey}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
                <p>De hoje até {selectedDeadline.toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
            <button className="secondary-button" type="submit">
              <Plus size={16} /> Criar meta
            </button>
          </form>
        </section>

        <section className="module-panel goals-panel" aria-labelledby="goal-list-title">
          <div className="module-heading">
            <h2 id="goal-list-title">Metas de foco</h2>
            <span>
              {focusedMinutes} min registrados em {subject.name}
            </span>
          </div>
          {subjectGoals.length === 0 ? (
            <div className="empty-state">
              <p>Crie uma meta para acompanhar seu tempo de foco.</p>
            </div>
          ) : (
            <ul className="goal-list">
              {subjectGoals.map((goal) => {
                const progress = Math.min(
                  100,
                  Math.round((focusedMinutes / goal.targetMinutes) * 100),
                );
                return (
                  <li className={goal.completed ? "is-complete" : undefined} key={goal.id}>
                    <button
                      type="button"
                      aria-label={`${goal.completed ? "Reabrir" : "Concluir"} ${goal.title}`}
                      onClick={() => dispatch({ type: "goal/toggled", id: goal.id })}
                    >
                      <Check size={15} />
                    </button>
                    <div>
                      <strong>{goal.title}</strong>
                      <small>
                        {progress}% · {focusedMinutes}/{goal.targetMinutes} min · até{" "}
                        {goal.deadline}
                      </small>
                      <span>
                        <i style={{ width: `${progress}%` }} />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
