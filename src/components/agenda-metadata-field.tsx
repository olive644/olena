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
  const id = useId(),
    panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="agenda-metadata-field">
      <button
        type="button"
        className="secondary-button"
        aria-label={`Preencher ${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        popoverTarget={id}
      >
        <AgendaDetailIcon name={name} />
        <span>{name === "guests" ? "Participantes" : label}</span>
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
            aria-label={`Fechar ${label}`}
            onClick={() => panel.current?.hidePopover()}
          >
            <AgendaCloseIcon />
          </button>
        </header>
        <label className="field">
          <span>
            {name === "links"
              ? "Um link por linha"
              : name === "guests"
                ? "E-mails separados por vírgula"
                : "Onde será?"}
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
        {name === "guests" && <small>Nenhum convite é enviado automaticamente.</small>}
        <button
          type="button"
          className="primary-button"
          onClick={() => panel.current?.hidePopover()}
        >
          Concluir
        </button>
      </div>
    </div>
  );
}
