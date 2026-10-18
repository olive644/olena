import { uiText, useLanguage } from "../i18n/runtime";
import type { CloudSyncState } from "../hooks/use-cloud-sync";
import { SignOutButton } from "./sign-out-button";

export function SecuritySettings({ cloud }: { cloud: CloudSyncState }) {
  useLanguage();

  const authenticated = cloud.authenticated === true;
  return (
    <section className="profile-card" aria-labelledby="security-session-title">
      <span className="section-label">{uiText(994)}</span>
      <h2 id="security-session-title">{uiText(995)}</h2>
      {authenticated ? (
        <>
          <dl className="profile-information">
            <div>
              <dt>{uiText(996)}</dt>
              <dd>{cloud.email || cloud.displayName || uiText(2072)}</dd>
            </div>
            <div>
              <dt>{uiText(997)}</dt>
              <dd>{uiText(998)}</dd>
            </div>
          </dl>
          <p>{uiText(999)}</p>
          {cloud.signOut && (
            <SignOutButton
              onSignOut={cloud.signOut}
              blocked={["syncing", "loading", "offline", "conflict"].includes(cloud.status)}
            />
          )}
        </>
      ) : (
        <p>{uiText(1000)}</p>
      )}
    </section>
  );
}
