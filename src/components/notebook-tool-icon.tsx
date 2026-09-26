export function NotebookToolIcon({ name }: { name: "cover" | "index" }) {
  return (
    <svg viewBox="0 0 40 40" className="paper-tab-icon" aria-hidden="true">
      {name === "cover" ? (
        <>
          <path fill="#292432" d="M6 4h23l5 4v27l-5 3H6Z" />
          <path fill="#D5CCBA" d="M10 30h21v5H10Z" />
          <path fill="#7C3AED" d="M9 3h21l3 4v26H9Z" />
          <path fill="#A779EF" d="M9 3h21L9 24Z" />
          <path fill="#51259B" d="m21 26 12-11v18H9Z" />
          <path fill="#51465D" d="M5 4h5v31H5Z" />
          <path fill="#FACC15" d="m29 13 2 4 5 1-3 3 1 5-5-2-4 2 1-5-3-3 4-1Z" />
          <path fill="#FFF9EF" d="M14 9h10v3H14Z" />
        </>
      ) : (
        <>
          <path fill="#51465D" d="M5 6h25v30H5Z" />
          <path fill="#D5CCBA" d="M8 5h24v29H8Z" />
          <path fill="#FFF9EF" d="M10 3h23v29H10Z" />
          <path fill="#7C3AED" d="M29 7h7v7h-7Z" />
          <path fill="#A779EF" d="M29 16h7v6h-7Z" />
          <path fill="#FACC15" d="M29 24h7v6h-7Z" />
          <path
            fill="#51465D"
            d="M14 9h3v3h-3Zm6 0h6v3h-6Zm-6 8h3v3h-3Zm6 0h6v3h-6Zm-6 8h3v3h-3Zm6 0h6v3h-6Z"
          />
        </>
      )}
    </svg>
  );
}
