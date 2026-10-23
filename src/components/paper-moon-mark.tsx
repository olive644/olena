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
      <use
        href={`/navigation-icons/paper/paper-bookmark.svg#${motif}-${compact ? "compact" : "ribbon"}-${stitched ? "stitched" : "plain"}`}
        width="64"
        height={compact ? "64" : "180"}
      />
    </svg>
  );
}
