export function RoomSocialIcon({
  kind,
}: {
  kind: "copy" | "lock" | "open" | "ready" | "away" | "remove";
}) {
  return (
    <svg className="room-social-icon" viewBox="0 0 40 40" aria-hidden="true">
      {kind === "copy" ? (
        <>
          <path fill="#B75333" d="M14 5h18l4 5v23H14z" />
          <path fill="#FFAE76" d="M14 5h18l-4 7H14z" />
          <path fill="#FACC15" d="M5 13h20l5 5v19H5z" />
          <path fill="#FFF9EF" d="M9 17h16v15H9z" />
          <path fill="#FFE88D" d="M5 13h20l-5 5H5z" />
          <path fill="#B99100" d="m25 13 5 5v19l-5-5z" />
        </>
      ) : kind === "remove" ? (
        <>
          <path fill="#D75268" d="m7 3 30 4-4 30-30-4z" />
          <path fill="#FF9DAB" d="m7 3 7 7 23-3z" />
          <path fill="#FFF9EF" d="m12 10 8 7 8-7 3 5-7 6 6 7-5 3-6-7-7 6-3-5 7-6-7-6z" />
        </>
      ) : kind === "ready" ? (
        <>
          <path fill="#187966" d="m20 2 16 9v19L20 39 4 30V11z" />
          <path fill="#67CEAC" d="m20 2 16 9-16 9L4 11z" />
          <path fill="#FFE88D" d="m9 21 5-5 6 7 10-13 5 5-15 17z" />
        </>
      ) : kind === "away" ? (
        <>
          <path fill="#75639A" d="m20 3 16 9-3 21-24 4-6-22z" />
          <path fill="#CDBDE9" d="M23 9c-14 3-13 22 2 23-7 6-19-1-17-11 1-8 8-14 15-12" />
          <path fill="#FACC15" d="m30 7 2 4 5 1-4 3v5l-4-3-5 1 2-5-3-3h5z" />
        </>
      ) : (
        <>
          <path fill="#665099" d="m6 17 29-3v23H6z" />
          <path fill="#A779EF" d="m6 17 7 5 22-8z" />
          <path
            fill="#FFE88D"
            d={
              kind === "open"
                ? "M15 18V9l6-5 9 3v5h-5V9l-4-1-2 3v7z"
                : "M12 18V9l8-6 10 6v9h-5v-7l-5-3-3 3v7z"
            }
          />
          <path fill="#FACC15" d="m21 23 4 3-2 4 1 3h-6l1-3-2-4z" />
        </>
      )}
    </svg>
  );
}
