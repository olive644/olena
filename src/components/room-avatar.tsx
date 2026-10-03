import { sanitizeRoomAvatar, type LocalRoomParticipant } from "../domain/local-room";
export function RoomAvatar({ participant }: { participant: LocalRoomParticipant }) {
  return (
    <img
      className="room-player-avatar"
      src={sanitizeRoomAvatar(participant.avatarUrl) ?? "/profile-avatars/helena.webp"}
      alt=""
      width="48"
      height="48"
      referrerPolicy="no-referrer"
      onError={(event) => {
        if (event.currentTarget.getAttribute("src") !== "/profile-avatars/helena.webp")
          event.currentTarget.src = "/profile-avatars/helena.webp";
      }}
    />
  );
}
