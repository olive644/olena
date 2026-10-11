import { type pomodoroWeek } from "../domain/agenda-insights";

function PaperFlower({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="40 20 170 220"
      aria-hidden="true"
      className={`agenda-week-flower${active ? " is-active" : ""}`}
    >
      <path fill={active ? "#287b5b" : "#716452"} d="m111 211 14-118 12 4-13 117Z" />
      <path
        fill={active ? "#42a577" : "#95816a"}
        d="m119 164-56-39 10 48 45 17Zm11-21 53-38-9 48-45 18Z"
      />
      <path fill={active ? "#287b5b" : "#716452"} d="m63 125 56 39-46 9Zm120-20-53 38 44 10Z" />
      <g transform={active ? undefined : "rotate(45 126 105)"}>
        <path
          fill={active ? "#a73750" : "#716452"}
          d="m72 77 22-43 37 27 30-36 19 47-26 28-51 2Z"
        />
        <path
          fill={active ? "#e55670" : "#95816a"}
          d="m67 74 45-18 12 47-35 25-28-29Zm57-17 43 8 22 34-31 31-39-27Z"
        />
        <path fill={active ? "#f27e92" : "#b7a184"} d="m89 82 37-24 35 27-7 42-47 5-25-28Z" />
        <path fill={active ? "#e55670" : "#95816a"} d="m89 82 37 20 35-17-35-27Z" />
      </g>
    </svg>
  );
}
export function AgendaFocusWeek({
  week,
  mode,
}: {
  week: ReturnType<typeof pomodoroWeek>;
  mode: "timer" | "pomodoro";
}) {
  return (
    <div className="agenda-study-metric agenda-focus-week">
      <h3>{mode === "timer" ? "Seu jardim de foco" : "Sua semana de Pomodoro"}</h3>
      <small>
        Semana de {week[0]!.key.split("-").reverse().join("/")}. Dias registrados dentro do filtro
        ficam vivos.
      </small>
      <div className="agenda-pomodoro-week" role="list">
        {week.map((day) => (
          <span
            key={day.key}
            role="listitem"
            className={`agenda-pomodoro-day${day.active ? " is-active" : ""}`}
            aria-label={`${day.label}, ${day.key}: ${day.active ? "concluído" : "sem registro no filtro"}`}
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
