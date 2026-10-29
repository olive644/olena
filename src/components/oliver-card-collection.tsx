import { ProfileCards } from "./profile-cards";
import type { OliverArtworkId } from "../data/oliver-tarot";
export function OliverCardCollection({
  onClose,
}: {
  onClose: () => void;
  incoming?: OliverArtworkId[] | undefined;
}) {
  return <ProfileCards initialOpen onClose={onClose} />;
}
