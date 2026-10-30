import { useState } from "react";
import type { SocialActivitySummary } from "../domain/profile-social";
import { activeArcanaId, useArcanaCatalog } from "../data/arcana-catalog";
import { ALL_ACHIEVEMENTS } from "../domain/math-achievements";
import { uiText } from "../i18n/runtime";
import { AchievementArt, AchievementCollection } from "./math-achievements";
import { OliverCard, ArcanaRarity } from "./oliver-card";
import { OliverCardInspection } from "./oliver-card-inspection";
import { LibraryDialog } from "./library-dialog";
import "./profile-cards.css";

export default function SocialReward({ activity }: { activity: SocialActivitySummary }) {
  const [open, setOpen] = useState(false);
  const { cards } = useArcanaCatalog();
  const id = activity.kind === "card" ? activeArcanaId(activity.ref ?? "") : undefined;
  const card = cards.find((item) => item.id === id);
  const badge =
    activity.kind === "achievement"
      ? ALL_ACHIEVEMENTS.find((item) => item.id === activity.ref)
      : undefined;
  if (!card && !badge) return null;
  return (
    <div className="social-reward">
      <button
        className="profile-cards__tile"
        onClick={() => setOpen(true)}
        aria-label={uiText("Inspecionar {0}", [card?.title ?? badge!.name])}
      >
        {card && id ? (
          <>
            <span className="profile-cards__miniature">
              <OliverCard id={id} thumbnail />
            </span>
            <strong>{card.title}</strong>
            <ArcanaRarity id={id} />
          </>
        ) : badge ? (
          <>
            <AchievementArt item={badge} thumb />
            <strong>{badge.name}</strong>
          </>
        ) : null}
      </button>
      {open && card && id && (
        <LibraryDialog title={card.title} onClose={() => setOpen(false)}>
          <OliverCardInspection id={id} />
        </LibraryDialog>
      )}
      {open && badge && (
        <AchievementCollection
          ids={[badge.id]}
          dates={{ [badge.id]: new Date(activity.at).toISOString() }}
          favorites={[]}
          initialId={badge.id}
          compact
          onInspectionClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
