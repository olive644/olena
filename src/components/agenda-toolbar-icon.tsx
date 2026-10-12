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
      {["day", "week", "month"].includes(name) && (
        <>
          <path fill="#292432" d="m8 9 31-1 4 5-2 28-32 2-4-6Z" />
          <path fill="#51465D" d="m8 9 5 5-4 29-4-6Z" />
          <path fill="#FFF9EF" d="M12 19h25v18H12Z" />
          <path fill="#FACC15" d="M15 4h5v12h-5Zm14 0h5v12h-5Z" />
          {name === "day" ? (
            <path fill="#7C3AED" d="M22 22h6v12h-6Z" />
          ) : name === "week" ? (
            <path fill="#7C3AED" d="M15 23h4v11h-4Zm7 0h4v11h-4Zm7 0h4v11h-4Z" />
          ) : (
            <path
              fill="#7C3AED"
              d="M15 22h5v5h-5Zm8 0h5v5h-5Zm8 0h3v5h-3ZM15 30h5v4h-5Zm8 0h5v4h-5Zm8 0h3v4h-3Z"
            />
          )}
        </>
      )}
      {name === "list" && (
        <>
          <path fill="#51465D" d="m10 7 24-3 8 10-3 28-27 2-5-5Z" />
          <path fill="#292432" d="M8 7h22l9 9v25H8Z" />
          <path fill="#FFF9EF" d="M13 12h14v8h8v16H13Z" />
          <path fill="#D8CDB9" d="m27 12 8 8h-8Z" />
          <path fill="#7C3AED" d="M15 23h17v3H15Zm0 7h17v3H15Z" />
        </>
      )}
      {name === "reminders" && (
        <>
          <path fill="#FACC15" d="m19 39 6-2 5 3-3 5-6-1Z" />
          <path fill="#292432" d="m21 5 7 1 2 7 7 7-1 13 6 5-3 4-32-3 1-5 6-5 1-13 6-5Z" />
          <path fill="#51465D" d="m21 5 3 9-5 19-11 1 6-5 1-13 6-5Z" />
          <path fill="#7C3AED" d="m27 14 7 7-1 12-6-2Z" />
        </>
      )}
    </svg>
  );
}
