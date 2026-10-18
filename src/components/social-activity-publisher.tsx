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
  useEffect(() => {
    if (
      !authenticated ||
      !savedAt ||
      !feed?.activitySharing ||
      published.current === `${feed.self.username}:${signature}`
    )
      return;
    const timer = window.setTimeout(
      () => {
        last.current = Date.now();
        void requestSocial({ action: "publish-activities" })
          .then(() => {
            published.current = `${feed.self.username}:${signature}`;
          })
          .catch(() => {});
      },
      Math.max(0, 60000 - (Date.now() - last.current)),
    );
    return () => window.clearTimeout(timer);
  }, [authenticated, savedAt, signature, feed?.activitySharing, feed?.self.username]);
  return null;
}
