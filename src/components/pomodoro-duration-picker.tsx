import { useId, useMemo, useState } from "react";
import { RoomStepSlider } from "./local-room-parts";
import { formatFocusDuration, isPomodoroDuration } from "../domain/pomodoro-duration";
import { uiText, useLanguage } from "../i18n/runtime";

export function PomodoroDurationPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange(value: number): void;
}) {
  useLanguage();
  const id = useId();
  const [hours, setHours] = useState(String(Math.floor(value / 60)));
  const [minutes, setMinutes] = useState(String(value % 60));
  const [error, setError] = useState(false);
  const steps = useMemo(
    () => [...new Set([5, 10, 15, 25, 50, 60, 120, value])].sort((a, b) => a - b),
    [value],
  );
  return (
    <form
      className="pomodoro-duration"
      onSubmit={(event) => {
        event.preventDefault();
        const total = Number(hours) * 60 + Number(minutes);
        if (
          hours === "" ||
          minutes === "" ||
          !Number.isInteger(Number(hours)) ||
          !Number.isInteger(Number(minutes)) ||
          Number(minutes) < 0 ||
          Number(minutes) > 59 ||
          Number(hours) < 0 ||
          Number(hours) > 99 ||
          !isPomodoroDuration(total)
        ) {
          setError(true);
          return;
        }
        setError(false);
        onChange(total);
      }}
    >
      <RoomStepSlider
        label={label}
        value={value}
        steps={steps}
        formatValue={formatFocusDuration}
        onCommit={onChange}
      />
      <div className="pomodoro-duration__clock" role="group" aria-label={label}>
        <label htmlFor={`${id}-hours`}>
          {uiText("Horas")}
          <input
            id={`${id}-hours`}
            type="number"
            min="0"
            max="99"
            step="1"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
          />
        </label>
        <span aria-hidden="true">:</span>
        <label htmlFor={`${id}-minutes`}>
          {uiText("Minutos")}
          <input
            id={`${id}-minutes`}
            type="number"
            min="0"
            max="59"
            step="1"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </label>
        <button className="secondary-button" type="submit">
          {uiText("Usar duração")}
        </button>
      </div>
      {error && (
        <p role="alert">{uiText("Escolha de 1 minuto a 99 h 59 min, com minutos entre 0 e 59.")}</p>
      )}
    </form>
  );
}
