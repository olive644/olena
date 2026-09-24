const shapes = {
  add: "M20 4h8v16h16v8H28v16h-8V28H4v-8h16Z",
  copyLink: "M5 14h24v29H5Z M15 4h24v29h-7V11H15Z",
  team: "M8 5h10l4 5-4 10H8L4 10Z M28 5h10l4 5-4 10H28l-4-10Z M5 24h16l4 17H1Z M27 24h16l4 17H25Z",
  exit: "M6 3h23v40H6Z M29 18h7v-6l11 12-11 12v-6h-7Z",
  share: "m12 22 23-13 3 5-23 13Z M12 25l25 12-3 5-24-12Z",
  cloudUpload: "M14 37h20a9 9 0 0 0 1-18 12 12 0 0 0-23 3 8 8 0 0 0 2 15Zm10-5V15m0 0-7 7m7-7 7 7",
  page: "M9 4h22l8 8v32H9Z",
  pen: "M6 29 25 5l9 8-20 23-10 3Z M24 7l8 7",
  highlighter: "M6 28 22 8l12 10-16 20H5Z",
  eraser: "M4 26 22 7l14 13-17 18H15Z",
  hand: "M23 2 14 11h6v9h-9v-6l-9 9 9 9v-6h9v9h-6l9 9 9-9h-6v-9h9v6l9-9-9-9v6h-9v-9h6Z",
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
  more: "M8 24a4 4 0 1 0 8 0 4 4 0 1 0-8 0Zm12 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0Zm12 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0Z",
  expand: "M3 3h14v6H9v8H3Z M25 3h14v14h-6V9h-8Z M3 25h6v8h8v6H3Z M33 25h6v14H25v-6h8Z",
  resize: "M8 8h12v4h-8v8H8ZM28 28h-8v-4h12v12h-4Z",
  collapse: "M11 3h6v14H3v-6h8Z M25 3h6v8h8v6H25Z M3 25h14v14h-6v-8H3Z M25 25h14v6h-8v8h-6Z",
  review: "M5 4h25l7 7v27H5Z",
  save: "M6 4h29l7 7v31H6Z",
  layers: "M4 14 24 4l20 10-20 10Z M4 24l20 10 20-10 M4 34l20 10 20-10",
  bringFront: "M24 4 36 16h-8v13h-8V16h-8Z M6 34h36v7H6Z",
  sendBack: "M12 6h8v10h8L16 28 4 16h8Z M6 34h36v7H6Z",
} as const;

const facets: Record<keyof typeof shapes, string> = {
  add: "M20 4h4v20H4v-4h16Z",
  copyLink: "M5 14h5v29H5Z M15 4h24l-6 6H15Z",
  team: "M8 5h10l-4 7H4Z M28 5h10l-4 7H24Z M5 24h8L6 41H1Z M27 24h8l-5 17h-5Z",
  exit: "M6 3h23L12 9v30l17 4H6Z M29 18h7l11 6H29Z",
  share: "m12 22 23-13 1 3-23 13Z",
  cloudUpload: "M14 37h20a9 9 0 0 0 1-18 12 12 0 0 0-23 3 8 8 0 0 0 2 15Zm10-5V15m0 0-7 7m7-7 7 7",
  page: "M31 4v9h8Z",
  pen: "m6 29 5 4L30 9l-5-4Z",
  highlighter: "m6 28 6 5 16-20-6-5Z",
  eraser: "",
  sticky: "",
  hand: "M23 2v21l-9-12h6Z M2 23h21l-12 9v-6Z M23 23v21l9-9h-6Z M23 23h21l-9-9v6Z",
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
  more: "M8 24a4 4 0 0 0 8 0 4 4 0 0 0-8 0Zm12 0a4 4 0 0 0 8 0 4 4 0 0 0-8 0Zm12 0a4 4 0 0 0 8 0 4 4 0 0 0-8 0Z",
  expand: "M3 3h14v3H6v11H3Z M25 3h14l-6 6V6h-8Z",
  resize: "M8 8h8v3H11v5H8ZM32 32h-8v-3h5v-5h3Z",
  collapse: "M11 3h3v11H3v-3h8Z M25 3h3v11h11v3H25Z",
  review: "M5 4h25l-9 7H11v27H5Z",
  save: "M6 4h6v38H6Z M35 4l7 7h-7Z",
  layers: "M4 14 24 24 44 14 24 4Z M4 24l20 10 20-10 M4 34l20 10 20-10",
  bringFront: "M24 4v22l-4-7h-8Z M6 34h36v3H6Z",
  sendBack: "M12 6h8v16l-4-6-4 6Z M6 34h36v3H6Z",
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
      {name === "cloudUpload" ? (
        <>
          <path d="M11 35h27l7-8-5-10-8-1-8-10-12 5-3 9-6 4 1 7Z" fill="currentColor" />
          <path d="m12 11 12-5-7 14-8 0Z" fill={light} />
          <path d="M21 36V25h-6l9-10 9 10h-6v11Z" fill={detail} />
        </>
      ) : name === "layers" ? (
        <>
          <path d="m4 31 20 10 20-10v6L24 47 4 37Z" fill="currentColor" />
          <path d="m4 20 20 10 20-10v6L24 36 4 26Z" fill={light} />
          <path d="M4 13 24 3l20 10-20 10Z" fill="currentColor" />
          <path d="M4 13 24 3v20Z" fill={light} />
        </>
      ) : name === "download" ? (
        <>
          <path d="M7 30h7v9h20v-9h7v15H7Z M20 3h8v19h9L24 35 11 22h9Z" fill="currentColor" />
          <path d="M20 3h4v32L11 22h9Z M7 30h4v15H7Z" fill={light} />
        </>
      ) : name === "save" ? (
        <>
          <path d="M6 4h30l7 8v31H6Z" fill="currentColor" />
          <path d="M6 4h6v39H6Z M36 4v8h7Z" fill={light} />
        </>
      ) : name === "eraser" ? (
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
      ) : name === "more" ? (
        <>
          <circle cx="12" cy="24" r="3.4" fill="currentColor" />
          <circle cx="24" cy="24" r="3.4" fill="currentColor" />
          <circle cx="36" cy="24" r="3.4" fill="currentColor" />
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
      {name === "share" && (
        <>
          <path
            d="m5 19 7-3 7 5v9l-8 4-7-5Z M29 3l9-2 7 7-3 9-10 1-5-7Z M29 33l9-2 7 7-3 9-10 1-5-7Z"
            fill="currentColor"
          />
          <path d="m29 3 9-2-6 17-5-7Z M5 19l7-3-1 18-7-5Z M29 33l9-2-6 17-5-7Z" fill={light} />
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
          <path d="M14 4h18v13H14Z M12 25h24v17H12Z" fill={detail} />
          <path d="M26 6h4v9h-4Z M16 29h16v2H16Zm0 5h16v2H16Z" fill="currentColor" />
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
