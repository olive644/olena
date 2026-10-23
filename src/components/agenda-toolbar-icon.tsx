import { PaperEditorIcon } from "./paper-editor-icon";
import { AgendaDetailIcon } from "./agenda-detail-icon";
export type AgendaToolbarAction =
  "day" | "week" | "month" | "list" | "import" | "export" | "print" | "reminders";
export function AgendaToolbarIcon({ name }: { name: AgendaToolbarAction }) {
  if (name === "import" || name === "export")
    return <PaperEditorIcon name={name === "import" ? "cloudUpload" : "download"} />;
  if (name === "print") return <AgendaDetailIcon name="print" />;
  return (
    <svg
      className="paper-action-icon"
      data-paper-icon={`agenda-${name}`}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <use href={`/navigation-icons/paper/agenda-toolbar.svg#${name}`} width="48" height="48" />
    </svg>
  );
}
