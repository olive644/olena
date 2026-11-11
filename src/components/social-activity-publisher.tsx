import { useEffect, useRef } from "react";
import { requestSocial } from "../data/profile-social";
import { useSocialFeed } from "../hooks/use-social-feed";
export function SocialActivityPublisher({
  authenticated,
  savedAt,
  signature,
}: {
  authenticated: boolean;
  savedAt?: number | undefined;
  signature: string;
}) {
  const feed = useSocialFeed(authenticated);
  const last = useRef(0);
  const published = useRef("");
  const rewardSignature = JSON.stringify([
    feed?.self.achievements,
    feed?.self.achievementDates,
    feed?.self.cards,
    feed?.self.cardDates,
  ]);
  const publication = `${feed?.self.username}:${signature}:${rewardSignature}`;
  useEffect(() => {
    if (!authenticated || !savedAt || !feed?.activitySharing || published.current === publication)
      return;
    const timer = window.setTimeout(
      () => {
        last.current = Date.now();
        void requestSocial({ action: "publish-activities" })
          .then(() => {
            published.current = publication;
          })
          .catch(() => {});
      },
      Math.max(0, 60000 - (Date.now() - last.current)),
    );
    return () => window.clearTimeout(timer);
  }, [authenticated, savedAt, publication, feed?.activitySharing]);
  return null;
}
