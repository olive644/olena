import { uiText, useLanguage } from "../i18n/runtime";
import { type pomodoroWeek } from "../domain/agenda-insights";

export function PaperFlower({ active }: { active: boolean }) {
  return (
    <img
      src={`/navigation-icons/paper/streak-flower-${active ? "active" : "inactive"}.svg`}
      width="170"
      height="220"
      alt=""
      aria-hidden="true"
      className={`agenda-week-flower${active ? " is-active" : ""}`}
    />
  );
}
export function AgendaFocusWeek({
  week,
  mode,
}: {
  week: ReturnType<typeof pomodoroWeek>;
  mode: "timer" | "pomodoro";
}) {
  useLanguage();

  return (
    <div className="agenda-study-metric agenda-focus-week">
      <h3>{mode === "timer" ? uiText(59) : uiText(60)}</h3>
      <div className="agenda-pomodoro-week" role="list">
        {week.map((day) => (
          <span
            key={day.key}
            role="listitem"
            className={`agenda-pomodoro-day${day.active ? " is-active" : ""}`}
            aria-label={`${day.label}, ${day.key}: ${day.active ? uiText(1590) : uiText(61)}`}
          >
            <span>{day.label}</span>
            {mode === "timer" ? (
              <PaperFlower active={day.active} />
            ) : (
              <i aria-hidden="true" className={`streak-tomato${day.active ? " is-active" : ""}`} />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
