export function AgendaDetailIcon({
  name,
}: {
  name: "clock" | "location" | "links" | "guests" | "attachment" | "print" | "filter" | "search";
}) {
  return (
    <svg
      className="paper-action-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      data-agenda-detail-icon={name}
    >
      {name === "filter" && (
        <>
          <path fill="#292432" d="M4 6h40v8L28 30v12l-9-4V30L4 14Z" />
          <path fill="#51465D" d="M4 6h40l-6 6H10Z" />
          <path fill="#FACC15" d="m20 26 8 4v12l-8-4Z" />
        </>
      )}
      {name === "search" && (
        <>
          <path fill="#292432" d="m18 3 12 4 7 13-5 12-13 5-12-6L3 18 8 8Z" />
          <path fill="#FFF9EF" d="m18 9 9 3 4 8-4 8-9 3-8-5-2-8 5-7Z" />
          <path fill="#7C3AED" d="m30 28 15 13-5 6-15-15Z" />
          <path fill="#FACC15" d="m35 33 10 8-3 3-10-8Z" />
        </>
      )}
      {name === "clock" && (
        <>
          <path fill="#51465D" d="m24 3 15 6 6 15-6 15-15 6-15-6-6-15L9 9Z" />
          <path fill="#FFF9EF" d="m24 7 12 5 5 12-5 12-12 5-12-5-5-12 5-12Z" />
          <path fill="#FACC15" d="M22 12h4v12h12v4H22Z" />
          <path fill="#292432" d="M22 21h4v8h-4Z" />
        </>
      )}
      {name === "location" && (
        <>
          <path fill="#51259B" d="m24 3 14 6 5 14-19 23L5 23 5 9Z" />
          <path fill="#7C3AED" d="m24 3 14 6 5 14-19 23V30L12 20 15 9Z" />
          <path fill="#FFF9EF" d="m24 12 7 4 1 8-8 5-8-5 1-8Z" />
          <path fill="#FACC15" d="m24 16 4 3v4l-4 2-4-2v-4Z" />
        </>
      )}
      {name === "links" && (
        <>
          <path fill="#292432" d="m4 28 14-15 11 1 5 7-6 7-5-5-3-1-9 9 1 3 4 1 4-4 6 6-8 7-11-1Z" />
          <path
            fill="#7C3AED"
            d="m44 20-14 15-11-1-5-7 6-7 5 5 3 1 9-9-1-3-4-1-4 4-6-6 8-7 11 1Z"
          />
          <path fill="#FACC15" d="m16 27 13-13 4 4-13 13Z" />
        </>
      )}
      {name === "guests" && (
        <>
          <path fill="#51465D" d="m7 7 10-2 6 8-4 10H9L4 15Zm22-1 10 1 5 8-5 9H29l-5-10Z" />
          <path fill="#292432" d="M8 26h13l4 18H2Zm21 0h12l5 18H24Z" />
          <path fill="#FACC15" d="m18 35 6-5 6 5-6 9Z" />
          <path fill="#7C3AED" d="M8 26h5L6 44H2Z" />
        </>
      )}
      {name === "attachment" && (
        <>
          <path fill="#292432" d="M8 6h25l9 10v26H8Z" />
          <path fill="#FFF9EF" d="M12 10h19v10h7v18H12Z" />
          <path fill="#7C3AED" d="M16 30 23 20l8 12H16Z" />
          <path fill="#FACC15" d="m17 14 5-1 2 5-5 3-4-3Z" />
        </>
      )}
      {name === "print" && (
        <>
          <path fill="#51465D" d="m5 18 33-2 7 7-2 16H5L2 24Z" />
          <path fill="#292432" d="M7 17h33v19H7Z" />
          <path fill="#D8CDB9" d="M12 4h23l4 5v12H12Z" />
          <path fill="#FFF9EF" d="M12 4h20v15H12Z" />
          <path fill="#FACC15" d="M32 22h6v5h-6Z" />
          <path fill="#FFF9EF" d="M12 29h23v15H12Z" />
          <path fill="#D8CDB9" d="m35 29 4 4-4 11Z" />
          <path fill="#292432" d="M17 33h13v3H17Zm0 6h10v2H17Z" />
        </>
      )}
    </svg>
  );
}
