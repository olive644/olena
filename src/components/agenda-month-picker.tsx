import { uiText, useLanguage, uiLocale } from "../i18n/runtime";
import { useId, useRef, useState } from "react";
import { PaperArrow } from "./paper-arrow";
import { AgendaCloseIcon } from "./agenda-close-icon";

const months = Array.from({ length: 12 }, (_, index) =>
  new Date(2026, index, 1).toLocaleDateString(uiLocale(), { month: "long" }),
);

export function AgendaMonthPicker({
  value,
  today,
  onChange,
}: {
  value: string;
  today: string;
  onChange: (date: string) => void;
}) {
  useLanguage();

  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  function choose(date: string) {
    onChange(date);
    panel.current?.hidePopover();
    trigger.current?.focus();
  }
  return (
    <div className="agenda-month-picker">
      <button
        ref={trigger}
        type="button"
        className="secondary-button agenda-month-trigger agenda-calendar-toggle"
        aria-label={uiText(71)}
        aria-haspopup="dialog"
        aria-expanded={open}
        popoverTarget={id}
        onClick={() => {
          if (!open) setYear(Number(value.slice(0, 4)));
        }}
      >
        <svg
          viewBox="0 0 48 48"
          width="34"
          height="34"
          aria-hidden="true"
          data-icon="agenda-calendar"
        >
          <use href="/navigation-icons/paper/agenda-month-calendar.svg#art" />
        </svg>
      </button>
      <span className="agenda-visible-month">
        {months[Number(value.slice(5, 7)) - 1]} {uiText(72)} {value.slice(0, 4)}
      </span>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={uiText(73)}
        className="agenda-month-popover"
        onToggle={(event) => {
          const visible = event.currentTarget.matches(":popover-open");
          setOpen(visible);
        }}
      >
        <header>
          <strong>{uiText(71)}</strong>
          <button
            type="button"
            className="icon-button"
            aria-label={uiText(74)}
            popoverTarget={id}
            popoverTargetAction="hide"
          >
            <AgendaCloseIcon />
          </button>
        </header>
        <div className="agenda-year-controls">
          <button
            type="button"
            className="secondary-button"
            aria-label={uiText(75)}
            disabled={year <= 1}
            onClick={() => setYear(year - 1)}
          >
            <PaperArrow back />
          </button>
          <label>
            <span>{uiText(76)}</span>
            <input
              aria-label={uiText(76)}
              type="text"
              inputMode="numeric"
              value={year}
              maxLength={4}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (/^\d{1,4}$/.test(event.target.value) && next >= 1) setYear(next);
              }}
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            aria-label={uiText(77)}
            disabled={year >= 9999}
            onClick={() => setYear(year + 1)}
          >
            <PaperArrow />
          </button>
        </div>
        <div className="agenda-month-options" role="group" aria-label={uiText(78)}>
          {months.map((name, index) => {
            const date = `${String(year).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}`;
            const selected = value.slice(0, 7) === date;
            return (
              <button
                key={name}
                type="button"
                className={selected ? "primary-button" : "secondary-button"}
                aria-pressed={selected}
                onClick={() => choose(`${date}-01`)}
              >
                {name}
              </button>
            );
          })}
        </div>
        <footer>
          <button type="button" className="secondary-button" onClick={() => choose(today)}>
            {uiText(79)}
          </button>
        </footer>
      </div>
    </div>
  );
}
