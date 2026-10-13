import { useId, useRef, useState } from "react";
import { AgendaCloseIcon } from "./agenda-close-icon";
import { PaperChoice } from "./agenda-paper-fields";
import { AgendaDetailIcon } from "./agenda-detail-icon";

export function AgendaFilters({
  subjects,
  subject,
  type,
  onSubject,
  onType,
}: {
  subjects: { value: string; label: string }[];
  subject: string;
  type: string;
  onSubject: (value: string) => void;
  onType: (value: string) => void;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="secondary-button agenda-tool"
        aria-label="Filtros"
        aria-expanded={open}
        aria-haspopup="dialog"
        popoverTarget={id}
        aria-pressed={Boolean(subject || type)}
      >
        <AgendaDetailIcon name="filter" />
        <span>Filtros</span>
      </button>
      <div
        id={id}
        ref={panel}
        popover="auto"
        role="dialog"
        aria-label="Filtros da agenda"
        className="agenda-field-popover agenda-filter-panel"
        onToggle={(event) => setOpen(event.currentTarget.matches(":popover-open"))}
      >
        <header>
          <h3>Filtros</h3>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar filtros"
            onClick={() => panel.current?.hidePopover()}
          >
            <AgendaCloseIcon />
          </button>
        </header>
        <PaperChoice
          label="Filtrar matéria"
          value={subject}
          onChange={onSubject}
          options={[{ value: "", label: "Todas as matérias" }, ...subjects]}
        />
        <PaperChoice
          label="Filtrar tipo"
          value={type}
          onChange={onType}
          options={[
            { value: "", label: "Todos os tipos" },
            { value: "appointment", label: "Compromissos" },
            { value: "study", label: "Estudos" },
            { value: "task", label: "Tarefas" },
          ]}
        />
      </div>
    </>
  );
}
