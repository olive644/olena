import { uiText, useLanguage } from "../i18n/runtime";
import { useId, useRef, useState } from "react";
import { AgendaDetailIcon } from "./agenda-detail-icon";
import { AgendaCloseIcon } from "./agenda-close-icon";
export function AgendaMetadataField({
  name,
  label,
  value,
  onChange,
}: {
  name: "location" | "links" | "guests";
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  useLanguage();

  const id = useId(),
    panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="agenda-metadata-field">
      <button
        type="button"
        className="secondary-button"
        aria-label={uiText(1592, [label])}
        aria-haspopup="dialog"
        aria-expanded={open}
        popoverTarget={id}
      >
        <AgendaDetailIcon name={name} />
        <span>{name === "guests" ? uiText(38) : label}</span>
      </button>
      {value && <p className="agenda-metadata-preview">{value}</p>}
      <div
        id={id}
        ref={panel}
        popover="auto"
        role="dialog"
        aria-label={label}
        className="agenda-field-popover agenda-metadata-panel"
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
            event.preventDefault();
            panel.current?.hidePopover();
          }
        }}
        onToggle={(event) => setOpen(event.currentTarget.matches(":popover-open"))}
      >
        <header>
          <h3>{label}</h3>
          <button
            type="button"
            className="icon-button"
            aria-label={uiText(1593, [label])}
            onClick={() => panel.current?.hidePopover()}
          >
            <AgendaCloseIcon />
          </button>
        </header>
        <label className="field">
          <span>
            {name === "links" ? uiText(1594) : name === "guests" ? uiText(68) : uiText(69)}
          </span>
          {name === "links" ? (
            <textarea
              autoFocus
              rows={4}
              maxLength={4000}
              value={value}
              placeholder="https://"
              onChange={(event) => onChange(event.target.value)}
            />
          ) : (
            <input
              autoFocus
              value={value}
              maxLength={name === "location" ? 300 : 1000}
              onChange={(event) => onChange(event.target.value)}
            />
          )}
        </label>
        {name === "guests" && <small>{uiText(70)}</small>}
        <button
          type="button"
          className="primary-button"
          onClick={() => panel.current?.hidePopover()}
        >
          {uiText(25)}
        </button>
      </div>
    </div>
  );
}
