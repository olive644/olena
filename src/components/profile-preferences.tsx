import { uiText, useLanguage } from "../i18n/runtime";
import { useState } from "react";
import type { WorkspaceState } from "../domain/workspace";
import { useTheme } from "../hooks/use-theme";
import { useStoredProfile } from "../hooks/use-stored-profile";
import { readSyncedStorage } from "../data/synced-storage";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { useNotebookPreferences } from "../data/notebook-preferences";
import { zonedDateTime } from "../domain/agenda-calendar";
import { NotebookPreferenceFields } from "./notebook-settings";
import { NavigationIcon } from "./navigation-icon";
import { PaperDigits } from "./paper-digits";
import { downloadExportBlob } from "../data/paper-export-art";
import { createStudyDataExport } from "../data/study-data-export";
import { profileAvatarSource } from "../domain/profile-avatars";
import { SignOutButton } from "./sign-out-button";
import {
  useNotificationPreferences,
  updateNotificationPreferences,
} from "../data/notification-preferences";

export function ProfileIdentity({
  guest,
  nameFallback = uiText(863),
  email,
  onSignIn,
  onSignOut,
  signOutBlocked = false,
}: {
  guest: boolean;
  nameFallback?: string;
  email?: string | undefined;
  onSignIn?: (() => void) | undefined;
  onSignOut?: ((discardPending?: boolean) => Promise<void>) | undefined;
  signOutBlocked?: boolean;
}) {
  useLanguage();

  const [profile] = useStoredProfile();
  const name = guest ? uiText(1890) : profile.name?.trim() || nameFallback;
  return (
    <section className="profile-card" aria-labelledby="profile-identity-title">
      <h2 id="profile-identity-title" className="section-label">
        {uiText(864)}
      </h2>
      <div className="profile-identity-preview">
        <img
          src={profileAvatarSource(profile.photoUrl)}
          alt={uiText(865)}
          width="72"
          height="72"
          draggable={false}
        />
        <strong>{name}</strong>
      </div>
      <h3 className="profile-information-title">{uiText(866)}</h3>
      <dl className="profile-information">
        <div>
          <dt>{uiText(867)}</dt>
          <dd>{email || (guest ? uiText(868) : uiText(1900))}</dd>
        </div>
        <div>
          <dt>{uiText(869)}</dt>
          <dd>{agendaTimeZone().replace(/_/g, " ")}</dd>
        </div>
      </dl>
      <div className="profile-account-actions">
        {onSignOut ? (
          <SignOutButton onSignOut={onSignOut} blocked={signOutBlocked} />
        ) : (
          onSignIn && (
            <button className="secondary-button" type="button" onClick={onSignIn}>
              {uiText(870)}
            </button>
          )
        )}
      </div>
    </section>
  );
}

export function ProfileAppearance() {
  useLanguage();

  const { preference, setThemePreference } = useTheme();
  return (
    <section className="profile-card" aria-labelledby="profile-appearance-title">
      <span className="section-label">{uiText(125)}</span>
      <h2 id="profile-appearance-title">{uiText(871)}</h2>
      <fieldset className="profile-theme-options">
        <legend>{uiText(872)}</legend>
        {(
          [
            ["light", uiText(1616)],
            ["dark", uiText(1617)],
            ["system", uiText(1618)],
          ] as const
        ).map(([value, label]) => (
          <button
            className={preference === value ? "primary-button" : "secondary-button"}
            type="button"
            key={value}
            aria-pressed={preference === value}
            onClick={() => setThemePreference(value)}
          >
            <NavigationIcon name={value === "dark" ? "theme-dark" : "theme-light"} />
            <span>{label}</span>
          </button>
        ))}
      </fieldset>
      <p>{uiText(873)}</p>
    </section>
  );
}

export function ProfileNotebookPreferences() {
  useLanguage();

  const { preferences, changePreference, preferenceError } = useNotebookPreferences();
  return (
    <section className="profile-card profile-card--wide" aria-labelledby="profile-notebooks-title">
      <span className="section-label">{uiText(652)}</span>
      <h2 id="profile-notebooks-title">{uiText(874)}</h2>
      <div className="profile-notebook-fields">
        <NotebookPreferenceFields preferences={preferences} onChange={changePreference} />
      </div>
      {preferenceError && <p role="alert">{preferenceError}</p>}
    </section>
  );
}

function notificationPermission() {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}
export function ProfileNotifications() {
  useLanguage();

  const preferences = useNotificationPreferences();
  const [permission, setPermission] = useState(notificationPermission);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section
      className="profile-card profile-card--wide"
      aria-labelledby="profile-notifications-title"
    >
      <span className="section-label">{uiText(875)}</span>
      <h2 id="profile-notifications-title">{uiText(876)}</h2>
      <fieldset className="notification-type-options">
        <legend>{uiText(877)}</legend>
        {(
          [
            ["followers", uiText(1901), uiText(878)],
            [
              "activities",
              uiText("Atividades e curtidas"),
              uiText("Conquistas de amigos e apoio às suas atividades."),
            ],
            ["agenda", uiText(93), uiText(1902)],
            ["updates", uiText(1903), uiText(879)],
            ["rewards", uiText(1904), uiText(880)],
          ] as const
        ).map(([key, label, hint]) => (
          <label key={key}>
            <span>
              <strong>{label}</strong>
              <small>{hint}</small>
            </span>
            <input
              type="checkbox"
              checked={preferences[key]}
              onChange={(event) => {
                try {
                  updateNotificationPreferences({ [key]: event.target.checked });
                  setError("");
                } catch {
                  setError(uiText(881));
                }
              }}
            />
          </label>
        ))}
      </fieldset>
      <p>
        {uiText(882)}{" "}
        <strong>
          {permission === "granted"
            ? uiText(1905)
            : permission === "denied"
              ? uiText(1906)
              : permission === "unsupported"
                ? uiText(883)
                : uiText(884)}
        </strong>
      </p>
      <p>{uiText(885)}</p>
      {permission === "denied" && <p>{uiText(886)}</p>}
      <button
        className="secondary-button"
        type="button"
        disabled={busy || permission !== "default"}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            setPermission(await Notification.requestPermission());
          } catch {
            setError(uiText(887));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? uiText(888) : uiText(889)}
      </button>
      <button
        className="secondary-button"
        type="button"
        onClick={() => setPermission(notificationPermission())}
      >
        {uiText(890)}
      </button>
      {error && <p role="alert">{uiText(error)}</p>}
    </section>
  );
}

export function ProfileProgress({ workspace }: { workspace: WorkspaceState }) {
  useLanguage();

  const zone = agendaTimeZone();
  const focus = workspace.focusSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const practices = workspace.practiceActivities ?? [];
  const correct =
    practices.reduce((sum, activity) => sum + activity.correct, 0) +
    workspace.quizAttempts.reduce((sum, attempt) => sum + attempt.correct, 0);
  const activeDays = new Set(
    [...workspace.focusSessions, ...practices, ...workspace.quizAttempts].map(
      (item) => zonedDateTime(Date.parse(item.completedAt), zone).date,
    ),
  ).size;
  return (
    <section className="profile-card profile-card--wide" aria-labelledby="profile-progress-title">
      <h2 id="profile-progress-title" className="section-label">
        {uiText(891)}
      </h2>
      <dl className="profile-progress-metrics">
        {[
          [focus, uiText(1907)],
          [correct, uiText(1908)],
          [activeDays, uiText(892)],
          [workspace.tasks.filter((task) => task.completed).length, uiText(893)],
        ].map(([value, label]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <PaperDigits value={String(value)} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ProfileDataExport({
  workspace,
  ready,
}: {
  workspace: WorkspaceState;
  ready: boolean;
}) {
  useLanguage();

  const [error, setError] = useState("");
  return (
    <section className="profile-card" aria-labelledby="profile-data-title">
      <span className="section-label">{uiText(894)}</span>
      <h2 id="profile-data-title">{uiText(895)}</h2>
      <p>{uiText(896)}</p>
      <p>{uiText(897)}</p>
      {!ready && <p role="status">{uiText(898)}</p>}
      <button
        className="secondary-button"
        type="button"
        disabled={!ready}
        onClick={() => {
          if (!ready) return;
          try {
            const data = createStudyDataExport(workspace, readSyncedStorage());
            downloadExportBlob(
              new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
              "olena-estudos.json",
            );
            setError("");
          } catch {
            setError(uiText(899));
          }
        }}
      >
        {uiText(900)}
      </button>
      {error && <p role="alert">{uiText(error)}</p>}
    </section>
  );
}
