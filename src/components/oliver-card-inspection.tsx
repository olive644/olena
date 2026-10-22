import type { OliverArtworkId } from "../data/oliver-tarot";
import { OliverCard } from "./oliver-card";
import { PaperArtInspection } from "./paper-art-inspection";

export function OliverCardInspection({
  id,
  compact = false,
}: {
  id: OliverArtworkId;
  compact?: boolean;
}) {
  return (
    <PaperArtInspection
      compact={compact}
      artwork={<OliverCard id={id} />}
      backArtwork={<OliverCard id={id} back />}
    />
  );
}
