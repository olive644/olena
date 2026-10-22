export function PaperEditorIcon({
  name,
}: {
  name:
    | "settings"
    | "add"
    | "copyLink"
    | "team"
    | "exit"
    | "share"
    | "cloudUpload"
    | "page"
    | "pen"
    | "highlighter"
    | "eraser"
    | "hand"
    | "select"
    | "text"
    | "sticky"
    | "zoomIn"
    | "zoomOut"
    | "reset"
    | "undo"
    | "redo"
    | "trash"
    | "download"
    | "print"
    | "close"
    | "more"
    | "expand"
    | "resize"
    | "collapse"
    | "review"
    | "save"
    | "layers"
    | "bringFront"
    | "sendBack";
}) {
  return (
    <svg
      className="paper-editor-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      data-paper-editor-icon={name}
    >
      <use href={`/navigation-icons/paper/paper-editor-icon.svg#${name}`} />
    </svg>
  );
}
