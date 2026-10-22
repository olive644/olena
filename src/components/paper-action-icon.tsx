export function PaperActionIcon({
  name,
}: {
  name: "plus" | "scan" | "handwriting" | "flag-us" | "flag-br" | "flag-es" | "book";
}) {
  return (
    <svg
      className="paper-action-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      data-paper-icon={name}
    >
      <use href={`/navigation-icons/paper/paper-action-icon.svg#${name}`} />
    </svg>
  );
}
