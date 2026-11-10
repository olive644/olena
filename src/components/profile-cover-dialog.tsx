import { ProfileAvatarDialog } from "./profile-avatar-dialog";
import type { WorkspaceState } from "../domain/workspace";
export function ProfileCoverDialog({
  onClose,
  workspace,
}: {
  onClose(): void;
  workspace?: WorkspaceState;
}) {
  return <ProfileAvatarDialog initialCategory="cover" onClose={onClose} workspace={workspace} />;
}
