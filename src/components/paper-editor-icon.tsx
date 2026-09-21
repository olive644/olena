const shapes = {
  pen: "M6 29 25 5l9 8-20 23-10 3Z M24 7l8 7",
  highlighter: "M6 28 22 8l12 10-16 20H5Z",
  eraser: "M4 26 22 7l14 13-17 18H15Z",
  hand: "M10 23V12h5V5h5v7h5v3h5v12l-6 11H13L4 27l3-4 5 5Z",
  select: "M6 4 35 22l-13 3-5 13Z",
  text: "M5 6h30v9h-5v-4h-7v24h5v4H12v-4h5V11h-7v4H5Z",
  sticky: "M5 5h30v22L24 38H5Z",
  zoomIn: "M5 7h20l7 7v13H12L5 20Z M25 26l12 11",
  zoomOut: "M5 7h20l7 7v13H12L5 20Z M25 26l12 11",
  reset: "M7 8v12h13l-5-5 8-2 8 7-2 10-12 3-5-5-5 5 8 7 17-3 7-15-9-15-17 2Z",
  undo: "M3 17 17 4v9h11l9 10v14h-7V26l-5-6h-8v9Z",
  redo: "M37 17 23 4v9H12L3 23v14h7V26l5-6h8v9Z",
  trash: "M9 12h22l-3 26H12Z M5 6h30v5H5Z M15 2h10v5H15Z",
  download: "M17 3h7v19h8L20 34 8 22h9Z M4 32h6v5h21v-5h6v11H4Z",
  print: "M10 3h22v10H10Z M4 14h34v17h-6v9H10v-9H4Z",
  close: "M7 4 20 16 32 4l5 5-12 12 12 12-5 5-12-12L7 38l-5-5 13-12L2 9Z",
  expand: "M3 3h14v6H9v8H3Z M25 3h14v14h-6V9h-8Z M3 25h6v8h8v6H3Z M33 25h6v14H25v-6h8Z",
  collapse: "M11 3h6v14H3v-6h8Z M25 3h6v8h8v6H25Z M3 25h14v14h-6v-8H3Z M25 25h14v6h-8v8h-6Z",
  review: "M5 4h25l7 7v27H5Z",
} as const;

export function PaperEditorIcon({ name }: { name: keyof typeof shapes }) {
  return (
    <svg
      className="paper-editor-icon"
      viewBox="0 0 44 46"
      aria-hidden="true"
      data-paper-editor-icon={name}
    >
      <path d={shapes[name]} fill="#51465D" transform="translate(2 3)" />
      <path d={shapes[name]} fill="#A779EF" />
      <path d="m5 5 10 0-10 10Z" fill="#FFE88D" />
      {(name === "zoomIn" || name === "zoomOut") && (
        <path
          d={name === "zoomIn" ? "M10 15h15v5H10Z M15 10h5v15h-5Z" : "M10 15h15v5H10Z"}
          fill="#FFF9EF"
        />
      )}
      {name === "review" && <path d="m11 22 6 6 13-15 4 4-17 19-10-10Z" fill="#FACC15" />}
      {name === "sticky" && <path d="M24 27h11L24 38Z" fill="#FACC15" />}
      {name === "print" && <path d="M14 27h14v9H14Z" fill="#FFF9EF" />}
    </svg>
  );
}
