import type { StoredProfile } from "../hooks/use-stored-profile";
export function PracticeUserPortrait({
  profile,
  className = "",
  level,
}: {
  profile: StoredProfile;
  className?: string;
  level?: number;
}) {
  return (
    <span className={`practice-user-portrait ${className}`}>
      <img
        src={profile.photoUrl || "/profile-avatars/helena.webp"}
        alt={level ? `Sua foto no nível ${level}` : "Sua foto sobre a ilha"}
        draggable={false}
        onError={(event) => {
          if (!event.currentTarget.src.endsWith("/profile-avatars/helena.webp"))
            event.currentTarget.src = "/profile-avatars/helena.webp";
        }}
      />
    </span>
  );
}
