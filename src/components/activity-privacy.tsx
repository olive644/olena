import { useState } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import { requestSocial } from "../data/profile-social";
import { useSocialFeed } from "../hooks/use-social-feed";
export function ActivityPrivacy({ enabled }: { enabled: boolean }) {
  useLanguage();
  const feed = useSocialFeed(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section
      className="profile-card profile-accessibility"
      aria-labelledby="activity-privacy-title"
    >
      <h2 id="activity-privacy-title">{uiText(2691)}</h2>
      <label>
        <span>
          <strong>{uiText(2692)}</strong>
          <small>{uiText(2693)}</small>
        </span>
        <input
          type="checkbox"
          disabled={!feed || busy}
          checked={feed?.activitySharing ?? true}
          onChange={async (event) => {
            setBusy(true);
            setError("");
            try {
              await requestSocial({ action: "activity-privacy", enabled: event.target.checked });
            } catch {
              setError(uiText(2694));
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {!enabled && <p>{uiText(2695)}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
