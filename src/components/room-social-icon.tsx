export function RoomSocialIcon({
  kind,
}: {
  kind: "copy" | "lock" | "open" | "ready" | "away" | "remove";
}) {
  return (
    <svg className="room-social-icon" viewBox="0 0 40 40" aria-hidden="true">
      <use href={`/room-icons/social-actions.svg#${kind}`} />
    </svg>
  );
}
