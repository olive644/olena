type PaperActionIconName =
  "plus" | "scan" | "handwriting" | "flag-us" | "flag-br" | "flag-es" | "book";

export function PaperActionIcon({ name }: { name: PaperActionIconName }) {
  const flag = name.startsWith("flag-");
  return (
    <svg
      className="paper-action-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      data-paper-icon={name}
    >
      {name === "plus" && (
        <>
          <path fill="#292432" d="M8 10 14 5h24l5 6-2 27-6 5H11l-6-6Z" />
          <path fill="#51465D" d="m8 10 6-5 4 7-5 24-8 1Z" />
          <path fill="#FFF9EF" d="M21 14h7v8h8v7h-8v8h-7v-8h-8v-7h8Z" />
          <path fill="#FACC15" d="m28 14 4 4-4 4Z" />
        </>
      )}
      {name === "scan" && (
        <>
          <path fill="#292432" d="M13 8h18l6 7v25H13Z" />
          <path fill="#FFF9EF" d="M11 6h18l6 7v25H11Z" />
          <path fill="#CABDA5" d="m29 6 6 7h-6Z" />
          <path fill="#51465D" d="M16 16h13v3H16Zm0 7h13v3H16Zm0 7h9v3h-9Z" />
          <path
            fill="#FACC15"
            d="M3 4h7v3H6v6H3Zm35 0h7v9h-3V7h-4ZM3 35h3v6h4v3H3Zm39 0h3v9h-7v-3h4Z"
          />
        </>
      )}
      {name === "handwriting" && (
        <>
          <path fill="#292432" d="m8 37 6-13L33 5l10 10-19 19Z" />
          <path fill="#FFF9EF" d="m13 24 19-19 6 6-19 19Z" />
          <path fill="#CABDA5" d="m19 30 19-19 4 4-19 19Z" />
          <path fill="#FFE88D" d="m13 24 10 10-15 5Z" />
          <path fill="#292432" d="m10 32 5 5-7 2Z" />
          <path fill="#FACC15" d="m32 5 4-3 9 9-3 4Z" />
          <path fill="#FFF9EF" d="M19 41h23v3H19Z" />
        </>
      )}
      {name === "book" && (
        <>
          <path fill="#292432" d="M5 10 22 7l3 5 17-4 1 29-17 4-4-3-17 3Z" />
          <path fill="#FFF9EF" d="m9 13 11-2 2 23-12 3Zm17 2 12-3 1 22-12 3Z" />
          <path fill="#FACC15" d="m29 12 5-1 1 16-3-3-3 4Z" />
        </>
      )}
      {flag && (
        <>
          <path fill={name === "flag-br" ? "#27834A" : "#BE3341"} d="m4 12 39-3-1 31-37 3Z" />
          {name === "flag-br" ? (
            <>
              <path fill="#FACC15" d="m23 14 16 11-16 13L8 27Z" />
              <circle fill="#333C88" cx="23" cy="26" r="7" />
            </>
          ) : name === "flag-es" ? (
            <path fill="#FACC15" d="m4 20 39-3-1 15-37 3Z" />
          ) : (
            <>
              <path fill="#FFF9EF" d="m5 17 37-3v3L5 20Zm0 8 37-3v3L5 28Zm0 8 37-3v3L5 36Z" />
              <path fill="#333C88" d="m4 12 18-1v16L5 28Z" />
            </>
          )}
          <path fill="#fff" opacity=".18" d="m4 12 39-3-16 7L5 31Z" />
        </>
      )}
    </svg>
  );
}
