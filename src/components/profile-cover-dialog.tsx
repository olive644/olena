import { ProfileAvatarDialog } from "./profile-avatar-dialog";
export function ProfileCoverDialog({ onClose }: { onClose(): void }) {
  return <ProfileAvatarDialog initialCategory="cover" onClose={onClose} />;
}
