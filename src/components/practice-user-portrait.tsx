import { uiText, useLanguage } from "../i18n/runtime";
import type { StoredProfile } from "../hooks/use-stored-profile";
import { profileAvatarSource } from "../domain/profile-avatars";
export function PracticeUserPortrait({
  profile,
  className = "",
  level,
}: {
  profile: StoredProfile;
  className?: string;
  level?: number;
}) {
  useLanguage();

  return (
    <span className={`practice-user-portrait ${className}`}>
      <img
        src={profileAvatarSource(profile.photoUrl)}
        alt={level ? uiText(1887, [level]) : uiText(818)}
        draggable={false}
        onError={(event) => {
          if (!event.currentTarget.src.endsWith("/profile-avatars/helena.webp"))
            event.currentTarget.src = "/profile-avatars/helena.webp";
        }}
      />
    </span>
  );
}
