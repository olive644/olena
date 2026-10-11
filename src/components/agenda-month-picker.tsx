import { useId, useRef, useState } from "react";
import { NavigationIcon } from "./navigation-icon";
import { PaperArrow } from "./paper-arrow";
import { PaperCloseIcon } from "./paper-close-icon";

const months = Array.from({ length: 12 }, (_, index) =>
  new Date(2026, index, 1).toLocaleDateString("pt-BR", { month: "long" }),
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
      <span className="agenda-month-caption">Escolher mês</span>
      <button
        ref={trigger}
        type="button"
        className="secondary-button agenda-month-trigger"
        aria-label="Escolher mês"
        aria-haspopup="dialog"
        aria-expanded={open}
        popoverTarget={id}
      >
        {months[Number(value.slice(5, 7)) - 1]} de {value.slice(0, 4)}
        <NavigationIcon name="planner" />
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="dialog"
        aria-label="Escolher mês e ano"
        className="agenda-month-popover"
        onToggle={(event) => {
          const visible = event.currentTarget.matches(":popover-open");
          setOpen(visible);
          if (visible) setYear(Number(value.slice(0, 4)));
        }}
      >
        <header>
          <strong>Escolher mês</strong>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar seletor de mês"
            popoverTarget={id}
            popoverTargetAction="hide"
          >
            <PaperCloseIcon />
          </button>
        </header>
        <div className="agenda-year-controls">
          <button
            type="button"
            className="secondary-button"
            aria-label="Ano anterior"
            disabled={year <= 1}
            onClick={() => setYear(year - 1)}
          >
            <PaperArrow back />
          </button>
          <label>
            <span>Ano</span>
            <input
              aria-label="Ano"
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
            aria-label="Próximo ano"
            disabled={year >= 9999}
            onClick={() => setYear(year + 1)}
          >
            <PaperArrow />
          </button>
        </div>
        <div className="agenda-month-options" role="group" aria-label="Meses do ano">
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
            Este mês
          </button>
        </footer>
      </div>
    </div>
  );
}
