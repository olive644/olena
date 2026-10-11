import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { dateForKey, monthDates } from "../domain/agenda";
import { toDateKey } from "../domain/workspace";
import { PaperArrow } from "./paper-arrow";
import { PaperDigits } from "./paper-digits";
import { AgendaCloseIcon } from "./agenda-close-icon";
import { AgendaActionIcon } from "./agenda-action-icon";
import "./agenda-paper-fields.css";

function navigateOptions(event: KeyboardEvent<HTMLElement>, columns = 1) {
  const steps: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -columns,
    ArrowDown: columns,
  };
  if (!(event.key in steps) && event.key !== "Home" && event.key !== "End") return;
  const options = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
  ];
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  event.preventDefault();
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? options.length - 1
        : Math.max(0, Math.min(options.length - 1, index + steps[event.key]!));
  options[next]?.focus();
}

export function PaperChoice({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="field agenda-paper-field">
      <span>{label}</span>
      <button
        ref={trigger}
        type="button"
        className="agenda-field-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        popoverTarget={id}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!panel.current?.matches(":popover-open")) panel.current?.showPopover();
            panel.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
          }
        }}
      >
        {options.find((option) => option.value === value)?.label ?? "Escolher"}
        <PaperArrow />
      </button>
      <div
        id={id}
        ref={panel}
        popover="auto"
        role="listbox"
        aria-label={`Opções de ${label}`}
        className="agenda-field-popover agenda-choice-options"
        onKeyDown={navigateOptions}
        onToggle={(event) => setOpen(event.currentTarget.matches(":popover-open"))}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={value === option.value}
            className={value === option.value ? "primary-button" : "secondary-button"}
            onClick={() => {
              onChange(option.value);
              panel.current?.hidePopover();
              trigger.current?.focus();
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function parsedDate(text: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const key = `${match[3]}-${match[2]}-${match[1]}`;
  return Number.isFinite(dateForKey(key).getTime()) && toDateKey(dateForKey(key)) === key
    ? key
    : null;
}
function dateText(date: string) {
  return date ? `${date.slice(8)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : "";
}

export function PaperDateField({
  label,
  value,
  onChange,
  min,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  optional?: boolean;
}) {
  const id = useId(),
    inputId = useId();
  const panel = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value || min || toDateKey(new Date()));
  const [buffer, setBuffer] = useState({ source: value, text: dateText(value) });
  useEffect(() => {
    input.current?.setCustomValidity(
      value && min && value < min ? "A data final deve ser igual ou posterior à data inicial." : "",
    );
  }, [value, min]);
  const choose = (date: string) => {
    input.current?.setCustomValidity("");
    setBuffer({ source: date, text: dateText(date) });
    onChange(date);
    panel.current?.hidePopover();
    input.current?.focus();
  };
  const move = (amount: number) => {
    const date = dateForKey(month);
    date.setDate(1);
    date.setMonth(date.getMonth() + amount);
    if (date.getFullYear() >= 1 && date.getFullYear() <= 9999) setMonth(toDateKey(date));
  };
  return (
    <div className="field agenda-paper-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="agenda-field-input">
        <input
          ref={input}
          id={inputId}
          type="text"
          inputMode="numeric"
          required={!optional}
          placeholder="dd/mm/aaaa"
          maxLength={10}
          value={buffer.source === value ? buffer.text : dateText(value)}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
            const text = `${digits.slice(0, 2)}${digits.length > 2 ? `/${digits.slice(2, 4)}` : ""}${digits.length > 4 ? `/${digits.slice(4)}` : ""}`,
              date = parsedDate(text);
            setBuffer({ source: value, text });
            const valid = date && (!min || date >= min);
            event.currentTarget.setCustomValidity(
              valid || (optional && !text) ? "" : "Escolha uma data válida no calendário.",
            );
            if (valid) onChange(date);
            else if (optional && !text) onChange("");
          }}
        />
        <button
          type="button"
          className="agenda-field-icon"
          aria-label={`Escolher ${label.toLowerCase()}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          popoverTarget={id}
          onClick={() => setMonth(value || min || toDateKey(new Date()))}
        >
          <AgendaActionIcon name="appointment" />
        </button>
      </div>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={`Calendário de ${label.toLowerCase()}`}
        className="agenda-field-popover agenda-date-popover"
        onToggle={(event) => setOpen(event.currentTarget.matches(":popover-open"))}
      >
        <header>
          <strong>{label}</strong>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar calendário da data"
            popoverTarget={id}
            popoverTargetAction="hide"
          >
            <AgendaCloseIcon />
          </button>
        </header>
        <div className="agenda-date-month">
          <button
            type="button"
            className="secondary-button"
            aria-label="Mês anterior"
            onClick={() => move(-1)}
          >
            <PaperArrow back />
          </button>
          <strong>
            {dateForKey(month).toLocaleDateString("pt-BR", { month: "long" })}{" "}
            <PaperDigits value={month.slice(0, 4)} />
          </strong>
          <button
            type="button"
            className="secondary-button"
            aria-label="Próximo mês"
            onClick={() => move(1)}
          >
            <PaperArrow />
          </button>
        </div>
        <div className="agenda-field-weekdays">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => (
            <span key={index}>{day}</span>
          ))}
        </div>
        <div
          className="agenda-date-days"
          role="group"
          aria-label="Escolher dia"
          onKeyDown={(event) => navigateOptions(event, 7)}
        >
          {monthDates(month).map((date) => (
            <button
              type="button"
              key={date}
              aria-label={dateForKey(date).toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              aria-pressed={date === value}
              disabled={Boolean(min && date < min)}
              className={`${date === value ? "is-picked" : ""} ${date.slice(0, 7) !== month.slice(0, 7) ? "is-outside" : ""}`}
              onClick={() => choose(date)}
            >
              <PaperDigits value={String(dateForKey(date).getDate())} />
            </button>
          ))}
        </div>
        <footer>
          <button
            type="button"
            className="secondary-button"
            disabled={Boolean(min && toDateKey(new Date()) < min)}
            onClick={() => choose(toDateKey(new Date()))}
          >
            Hoje
          </button>
          {optional && (
            <button type="button" className="secondary-button" onClick={() => choose("")}>
              Sem data final
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

export function PaperTimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId(),
    inputId = useId();
  const panel = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [buffer, setBuffer] = useState({ source: value, text: value });
  const select = (part: "hour" | "minute", number: number) => {
    input.current?.setCustomValidity("");
    const [hour, minute] = value.split(":");
    const next = `${part === "hour" ? String(number).padStart(2, "0") : hour}:${part === "minute" ? String(number).padStart(2, "0") : minute}`;
    setBuffer({ source: next, text: next });
    onChange(next);
  };
  return (
    <div className="field agenda-paper-field">
      <label htmlFor={inputId}>Horário</label>
      <div className="agenda-field-input">
        <input
          ref={input}
          id={inputId}
          type="text"
          inputMode="numeric"
          required
          pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
          maxLength={5}
          value={buffer.source === value ? buffer.text : value}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
            const text = `${digits.slice(0, 2)}${digits.length > 2 ? `:${digits.slice(2)}` : ""}`;
            setBuffer({ source: value, text });
            if (/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) onChange(text);
          }}
        />
        <button
          type="button"
          className="agenda-field-icon"
          aria-label="Escolher horário"
          aria-haspopup="dialog"
          aria-expanded={open}
          popoverTarget={id}
        >
          <AgendaActionIcon name="appointment" />
        </button>
      </div>
      <div
        id={id}
        ref={panel}
        popover="auto"
        role="dialog"
        aria-label="Escolher horário"
        className="agenda-field-popover agenda-time-popover"
        onToggle={(event) => {
          const visible = event.currentTarget.matches(":popover-open");
          setOpen(visible);
          if (visible)
            event.currentTarget
              .querySelectorAll<HTMLElement>(".agenda-time-options")
              .forEach((column) => {
                const selected = column.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
                if (selected)
                  column.scrollTop =
                    selected.offsetTop - column.clientHeight / 2 + selected.clientHeight / 2;
              });
        }}
      >
        <header>
          <strong>
            <PaperDigits value={value} />
          </strong>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar horários"
            popoverTarget={id}
            popoverTargetAction="hide"
          >
            <AgendaCloseIcon />
          </button>
        </header>
        <div className="agenda-time-columns">
          {(["hour", "minute"] as const).map((part) => (
            <div key={part}>
              <strong>{part === "hour" ? "Horas" : "Minutos"}</strong>
              <div
                className="agenda-time-options"
                role="group"
                aria-label={part === "hour" ? "Horas" : "Minutos"}
                onKeyDown={navigateOptions}
              >
                {Array.from({ length: part === "hour" ? 24 : 60 }, (_, number) => (
                  <button
                    key={number}
                    type="button"
                    aria-label={`${String(number).padStart(2, "0")} ${part === "hour" ? "horas" : "minutos"}`}
                    aria-pressed={Number(value.split(":")[part === "hour" ? 0 : 1]) === number}
                    onClick={() => select(part, number)}
                  >
                    <PaperDigits value={String(number).padStart(2, "0")} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <footer>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              panel.current?.hidePopover();
              input.current?.focus();
            }}
          >
            Confirmar horário <PaperArrow />
          </button>
        </footer>
      </div>
    </div>
  );
}
