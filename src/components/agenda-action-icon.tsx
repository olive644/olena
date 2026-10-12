export function AgendaActionIcon({
  name,
}: {
  name: "study" | "appointment" | "once" | "weekly" | "edit";
}) {
  return (
    <img
      className="paper-action-icon"
      src={`/navigation-icons/paper/agenda-${name}.svg`}
      data-paper-icon={name}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
