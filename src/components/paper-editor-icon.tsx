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
  save: "M5 4h26l8 8v28H5Z",
} as const;

const facets: Record<keyof typeof shapes, string> = {
  pen: "m6 29 5 4L30 9l-5-4Z",
  highlighter: "m6 28 6 5 16-20-6-5Z",
  eraser: "",
  sticky: "",
  hand: "M10 23v-11h5v19l-5-5Z M20 12h5v16h-5Z",
  select: "M6 4 20 22l-3 16Z",
  text: "M5 6h30v4H5Z M17 11h3v24h-3Z",
  zoomIn: "M5 7h20l-5 5H10v8H5Z",
  zoomOut: "M5 7h20l-5 5H10v8H5Z",
  reset: "m7 8 6 5 10-6 9 4-9-6-10 4Z",
  undo: "M3 17 17 4v6L8 18l9 5v6Z",
  redo: "M37 17 23 4v6l9 8-9 5v6Z",
  trash: "M9 12h6v26h-3Z M5 6h30v3H5Z",
  download: "M17 3h3v24l-7-5H8l12 12-3-10Z",
  print: "M4 14h34v5H9v12H4Z",
  close: "M7 4 20 16l-4 3L2 9Z M25 21l12 12-5 1-10-10Z",
  expand: "M3 3h14v3H6v11H3Z M25 3h14l-6 6V6h-8Z",
  collapse: "M11 3h3v11H3v-3h8Z M25 3h3v11h11v3H25Z",
  review: "M5 4h25l-9 7H11v27H5Z",
  save: "M5 4h26l-5 5H10v31H5Z",
};

export function PaperEditorIcon({ name }: { name: keyof typeof shapes }) {
  const body = name === "pen" ? "#FACC15" : name === "highlighter" ? "#6BBF59" : "currentColor";
  const light =
    name === "pen"
      ? "#FFE88D"
      : name === "highlighter"
        ? "#B5E68A"
        : "var(--editor-icon-facet, #66616B)";
  const detail = "var(--editor-icon-cutout, #FFF9EF)";
  return (
    <svg
      className="paper-editor-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      data-paper-editor-icon={name}
    >
      {name === "eraser" ? (
        <>
          <g transform="translate(2 2) rotate(-35 24 24)">
            <path d="M6 17h35l1 13-36 1Z" fill="#17151C" />
          </g>
          <g transform="rotate(-35 24 24)">
            <path d="M6 17h20v14H6Z" fill="#7C3AED" />
            <path d="M6 17h20v5H6Z" fill="#A779EF" />
            <path d="M6 26h20v5H6Z" fill="#51259B" />
            <path d="m26 17 15 1 1 11-16 2Z" fill="#FFF9EF" />
            <path d="m26 25 16 1v3l-16 2Z" fill="#FFE88D" />
            <path d="M25 17h2v14h-2Z" fill="#292432" />
          </g>
          <path d="M6 40h22v3H6Z" fill="#292432" />
        </>
      ) : name === "sticky" ? (
        <>
          <path d="M8 7h32v26l-8 8H8Z" fill="#17151C" transform="translate(2 2)" />
          <path d="M8 7h32v26l-8 8H8Z" fill="#FACC15" />
          <path d="M8 7h14L8 21Z" fill="#FFE88D" />
          <path d="M32 33h8l-8 8Z" fill="#292432" />
          <path d="M13 17h20v3H13Zm0 7h17v3H13Zm0 7h9v3h-9Z" fill="#292432" />
        </>
      ) : (
        <>
          <path d={shapes[name]} fill="#17151C" transform="translate(2 3)" />
          <path d={shapes[name]} fill="#51465D" transform="translate(0 1)" />
          <path d={shapes[name]} fill={body} />
          <path d={facets[name]} fill={light} />
        </>
      )}
      {name === "pen" && (
        <>
          <path d="m6 29 8 7-10 3Z" fill="#FFE88D" />
          <path d="m5 35 4 3-5 1Z" fill="#292432" />
          <path d="m25 5 5-3 8 7-4 4Z" fill="#EF6C87" />
        </>
      )}
      {name === "highlighter" && (
        <>
          <path d="M5 34h15l-3 5H5Z" fill="#FACC15" />
          <path d="m21 10 9 8-3 4-9-8Z" fill="#FFE88D" />
        </>
      )}
      {name === "trash" && <path d="M17 17h3v15h-3Zm7 0h3v15h-3Z" fill={detail} />}
      {name === "save" && (
        <>
          <path d="M13 4h14v12H13Z" fill={detail} />
          <path d="M12 24h20v16H12Z" fill={detail} />
          <path d="M17 28h10v3H17Zm0 6h10v3H17Z" fill="currentColor" />
        </>
      )}
      {(name === "zoomIn" || name === "zoomOut") && (
        <path
          d={name === "zoomIn" ? "M10 15h15v5H10Z M15 10h5v15h-5Z" : "M10 15h15v5H10Z"}
          fill={detail}
        />
      )}
      {name === "review" && <path d="m11 22 6 6 13-15 4 4-17 19-10-10Z" fill={detail} />}
      {name === "print" && <path d="M14 27h14v9H14Z" fill={detail} />}
    </svg>
  );
}
