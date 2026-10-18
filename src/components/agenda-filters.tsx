import { uiText, useLanguage } from "../i18n/runtime";
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
  useLanguage();

  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="secondary-button agenda-tool"
        aria-label={uiText(53)}
        aria-expanded={open}
        aria-haspopup="dialog"
        popoverTarget={id}
        aria-pressed={Boolean(subject || type)}
      >
        <AgendaDetailIcon name="filter" />
        <span>{uiText(53)}</span>
      </button>
      <div
        id={id}
        ref={panel}
        popover="auto"
        role="dialog"
        aria-label={uiText(54)}
        className="agenda-field-popover agenda-filter-panel"
        onToggle={(event) => setOpen(event.currentTarget.matches(":popover-open"))}
      >
        <header>
          <h3>{uiText(53)}</h3>
          <button
            type="button"
            className="icon-button"
            aria-label={uiText(55)}
            onClick={() => panel.current?.hidePopover()}
          >
            <AgendaCloseIcon />
          </button>
        </header>
        <PaperChoice
          label={uiText(56)}
          value={subject}
          onChange={onSubject}
          options={[{ value: "", label: uiText(57) }, ...subjects]}
        />
        <PaperChoice
          label={uiText(58)}
          value={type}
          onChange={onType}
          options={[
            { value: "", label: uiText(2542) },
            { value: "appointment", label: uiText(2543) },
            { value: "study", label: uiText(2544) },
            { value: "task", label: uiText(2545) },
          ]}
        />
      </div>
    </>
  );
}
