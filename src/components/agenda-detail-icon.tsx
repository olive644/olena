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
      <use href={`/navigation-icons/paper/agenda-detail.svg#${name}`} width="48" height="48" />
    </svg>
  );
}
