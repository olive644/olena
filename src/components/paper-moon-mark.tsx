export function PaperMoonMark({
  className,
  compact = false,
  motif = "moon",
  stitched = false,
}: {
  className?: string;
  compact?: boolean;
  motif?: "moon" | "sun" | undefined;
  stitched?: boolean;
}) {
  return (
    <svg
      viewBox={compact ? "0 0 64 64" : "0 0 64 180"}
      aria-hidden="true"
      className={className ?? "paper-tab-moon"}
      focusable="false"
      data-motif={motif}
    >
      {!compact && (
        <g transform="translate(0 -44)">
          <path fill="#FFF9EF" d="M15 46h36v130l-18-6-18 6Z" />
          <path fill="#51259B" d="M19 48h28v123l-14-5-14 5Z" />
          <path fill="#7C3AED" d="m19 48 28 14v74l-28 25Z" />
          <path fill="var(--tab-color, #FACC15)" d="m19 116 9 8-9 15Zm28 19-11 10 11 10Z" />
          <path fill="#A779EF" d="m19 48 8 5v48l-8 8Z" />
          <path fill="#FFE88D" d="m33 76 3 6 7 2-6 4-1 7-5-5-7 1 3-6-2-7 6 2Z" />
          <path fill="none" stroke="#D8BEFA" strokeWidth="1.4" d="m33 96 5 12-10 12 7 20" />
          <path fill="#FFF9EF" d="m38 104 3 4-3 4-3-4Zm-10 13 3 3-3 3-3-3Zm7 20 3 4-3 4-3-4Z" />
          <path fill="#FFE88D" d="m31 151 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" />
        </g>
      )}
      <g transform={compact ? undefined : "translate(0 116)"}>
        {motif === "sun" ? (
          <>
            <path
              fill="#FFF9EF"
              d="m32 0 9 10 14-1 1 14 8 9-9 10 1 14-15-1-9 9-9-9-14 1 1-14L0 32l10-9L9 9l14 1Z"
            />
            <path
              fill="#FACC15"
              d="m32 5 8 10 11-2-1 12 9 7-9 8 1 11-12-1-7 9-8-9-11 1 1-12-9-7 10-8-2-11 12 1Z"
            />
            <path fill="#D7A80A" d="m32 32 27 0-9 8 1 11-12-1-7 9-8-9-11 1Z" />
            <path fill="#FFE88D" d="m32 16 12 5 5 11-5 12-12 5-12-5-5-12 5-11Z" />
            <path fill="#FACC15" d="m32 20 12 12-12 13-12-13Z" />
            <path fill="#FFF9EF" d="m32 20 0 12-12 0Z" />
          </>
        ) : (
          <>
            <path
              fill="#FFF9EF"
              d="m37 4-21 7L4 27l2 20 15 15 17 2 15-6 9-13-17 4-13-9-6-14 3-12Z"
            />
            <path
              fill="#FACC15"
              d="m29 9-13 7-8 13 2 16 11 13 16 4 13-6 7-8-14 3-15-8-7-16 1-11Z"
            />
            <path fill="#FFE88D" d="m29 9-13 7-8 13 9 8 4-10 1-11Z" />
            <path fill="#D7A80A" d="m10 45 11 13 16 4 13-6 7-8-14 3-15-8 6 12Z" />
            <path fill="#FFF9EF" d="m43 19 3 7 8 3-8 3-3 8-3-8-8-3 8-3Z" />
          </>
        )}
        {stitched && (
          <path
            fill="none"
            stroke="#fff9ef"
            strokeWidth="1.6"
            strokeDasharray="2.4 2.4"
            strokeLinecap="round"
            d={
              motif === "sun"
                ? "m32 9 7 9 9-2-1 10 8 6-8 7 1 9-10-1-6 8-7-8-9 1 1-10-8-6 9-7-2-9 10 1Z"
                : "m22 15-9 14 1 14 10 11 13 4 11-5-7 1-15-9-9-17 1-10Z"
            }
          />
        )}
      </g>
    </svg>
  );
}
