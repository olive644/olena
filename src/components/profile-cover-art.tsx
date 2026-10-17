import type { ProfileCover } from "../domain/profile-covers";

export function ProfileCoverArt({ theme }: { theme: ProfileCover }) {
  return (
    <img
      src={`/profile-covers/${theme}.svg`}
      data-cover={theme}
      alt=""
      aria-hidden="true"
      width="1200"
      height="320"
    />
  );
}
