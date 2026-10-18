import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import { lazy, Suspense, useEffect, useRef, useState, type Dispatch } from "react";
import {
  useAccessibility,
  updateAccessibility,
  type AccessibilityPreferences,
} from "../data/accessibility-preferences";
import { PageHeader } from "../components/app-navigation";
import { ProfileShowcase, ProfileOverview } from "../components/profile-showcase";
import { PaperEditorIcon } from "../components/paper-editor-icon";
import { PaperArrow } from "../components/paper-arrow";
import { PaperCheckIcon } from "../components/paper-check-icon";
import { PrivacyNotice } from "../components/privacy-notice";
import { ActivityPrivacy } from "../components/activity-privacy";
import { DeleteAccountPanel } from "../components/delete-account-panel";
import { accountConfirmationName } from "../data/account-deletion";
import type { WorkspaceAction, WorkspaceState } from "../domain/workspace";
import {
  hasStudyModality,
  studyModalities,
  type StudyModality,
  type StudyPreferences,
} from "../domain/study-preferences";
import { GUEST_NAME } from "../domain/guest-session";
import type { CloudSyncState } from "../hooks/use-cloud-sync";
import type { WorkspaceHistoryEntry } from "../data/workspace-history";
import { SettingsIcon, type SettingsIconName } from "../components/settings-icon";
import { SettingsFooter } from "../components/settings-footer";
import { LanguageSwitch } from "../components/language-switch";
import { SecuritySettings } from "../components/security-settings";
import { HelenaLoading } from "../components/helena-loading";
const SupportChat = lazy(() =>
  import("../components/support-chat").then((module) => ({ default: module.SupportChat })),
);
import {
  ProfileAppearance,
  ProfileIdentity,
  ProfileNotebookPreferences,
  ProfileNotifications,
  ProfileDataExport,
} from "../components/profile-preferences";
import "./profile-view.css";
import "../components/settings-extras.css";

const SECTIONS: readonly { id: string; label: string; icon: SettingsIconName }[] = localizeLabels(
  () => [
    { id: "account", label: uiText(1515), icon: "account" },
    { id: "security", label: uiText(994), icon: "security" },
    { id: "support", label: uiText(1011), icon: "support" },
    { id: "appearance", label: uiText(1516), icon: "appearance" },
    { id: "study", label: uiText(2040), icon: "study" },
    { id: "notebooks", label: uiText(652), icon: "notebooks" },
    { id: "notifications", label: uiText(875), icon: "notifications" },
    { id: "data", label: uiText(2041), icon: "data" },
  ],
);

type ProfileViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  cloud: CloudSyncState;
  guest?: boolean;
  onSignIn?: () => void;
  history: WorkspaceHistoryEntry[];
  onRestoreSnapshot: (entry: WorkspaceHistoryEntry) => void;
};

export function ProfileView({
  workspace,
  dispatch,
  cloud,
  guest = false,
  onSignIn,
}: ProfileViewProps) {
  useLanguage();

  const [section, setSection] = useState("account");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia?.("(max-width: 760px)").matches ?? false,
  );
  const sectionTitle = useRef<HTMLHeadingElement>(null);
  const settingsNav = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 760px)");
    if (!media) return;
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  function chooseSection(id: string) {
    setSection(id);
    setMobileDetail(true);
    if (mobile)
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
        sectionTitle.current?.focus({ preventScroll: true });
      });
  }
  function backToSettings() {
    setMobileDetail(false);
    window.requestAnimationFrame(() => {
      settingsNav.current
        ?.querySelector<HTMLButtonElement>(`[data-section="${section}"]`)
        ?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }
  const [settingsOpen, setSettingsOpen] = useState(false);
  const accessibility = useAccessibility();
  const [accessibilityError, setAccessibilityError] = useState("");
  function changeAccessibility(update: Partial<AccessibilityPreferences>) {
    setAccessibilityError(updateAccessibility(update) ? "" : uiText(1517));
  }
  function updatePomodoroMinutes(pomodoroMinutes: 25 | 50) {
    dispatch({
      type: "focus/preferences-updated",
      preferences: { ...workspace.focusPreferences, pomodoroMinutes },
    });
  }

  function toggleLongBreaks() {
    dispatch({
      type: "focus/preferences-updated",
      preferences: {
        ...workspace.focusPreferences,
        longBreaks: !workspace.focusPreferences.longBreaks,
      },
    });
  }

  function updateStudyPreferences(update: Partial<StudyPreferences>) {
    dispatch({
      type: "study/preferences-updated",
      preferences: { ...workspace.studyPreferences, ...update },
    });
  }

  function toggleModality(modality: StudyModality) {
    const modalities = hasStudyModality(workspace.studyPreferences, modality)
      ? workspace.studyPreferences.modalities.filter((item) => item !== modality)
      : [...workspace.studyPreferences.modalities, modality];
    updateStudyPreferences({ modalities });
  }

  const modalityLabels: Record<StudyModality, string> = {
    visual: uiText(2010),
    auditivo: uiText(2011),
    "leitura-escrita": uiText(2012),
    pratico: uiText(2013),
  };

  return (
    <main className="main-content profile-view" id="main-content">
      <ProfileShowcase
        syncStatus={cloud.status}
        presentationReady={
          cloud.ready && cloud.authenticated === true && cloud.status !== "loading"
        }
        workspace={workspace}
        settingsOpen={settingsOpen}
        guest={guest}
        nameFallback={guest ? GUEST_NAME : cloud.displayName || uiText(863)}
      >
        <PageHeader
          showUpdates={false}
          leadingAction={
            <div className="profile-header-actions">
              {settingsOpen && <LanguageSwitch />}
              <button
                className="appearance-picker__trigger profile-settings-toggle"
                type="button"
                aria-label={
                  settingsOpen
                    ? mobile && mobileDetail
                      ? uiText(1518)
                      : uiText(1519)
                    : uiText(734)
                }
                aria-expanded={settingsOpen}
                aria-controls="profile-settings"
                onClick={() => {
                  if (settingsOpen && mobile && mobileDetail) {
                    backToSettings();
                    return;
                  }
                  setMobileDetail(false);
                  setSettingsOpen(!settingsOpen);
                  window.scrollTo({ top: 0, behavior: "instant" });
                }}
              >
                {settingsOpen ? <PaperArrow back /> : <PaperEditorIcon name="settings" />}
              </button>
            </div>
          }
        />
      </ProfileShowcase>
      {!settingsOpen && <ProfileOverview workspace={workspace} dispatch={dispatch} />}
      <header className="profile-settings-heading" hidden={!settingsOpen}>
        <h1>{uiText(734)}</h1>
      </header>
      <div
        className="profile-settings-layout"
        id="profile-settings"
        hidden={!settingsOpen}
        data-open={settingsOpen}
        data-detail={mobileDetail}
        data-section={section}
      >
        <nav
          ref={settingsNav}
          className="profile-settings-nav"
          aria-label={uiText(1520)}
          hidden={mobile && mobileDetail}
        >
          {SECTIONS.map((item) => (
            <button
              type="button"
              className={!mobile && section === item.id ? "primary-button" : "secondary-button"}
              aria-current={!mobile && section === item.id ? "page" : undefined}
              aria-controls="profile-settings-content"
              onClick={() => chooseSection(item.id)}
              data-section={item.id}
              key={item.id}
            >
              <SettingsIcon name={item.icon} />
              <span>{item.label}</span>
              <span className="settings-menu-chevron" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
          <SettingsFooter />
        </nav>
        <div
          className="profile-settings-content"
          id="profile-settings-content"
          hidden={mobile && !mobileDetail}
        >
          <h2 ref={sectionTitle} tabIndex={-1} className="profile-section-title">
            {SECTIONS.find((item) => item.id === section)?.label}
          </h2>
          <div className="profile-settings-grid" key={section}>
            {section === "account" && (
              <ProfileIdentity
                guest={guest}
                nameFallback={cloud.displayName || uiText(863)}
                email={!guest && cloud.authenticated === true ? cloud.email : undefined}
                onSignIn={onSignIn}
                onSignOut={!guest && cloud.authenticated === true ? cloud.signOut : undefined}
                signOutBlocked={["syncing", "loading", "offline", "conflict"].includes(
                  cloud.status,
                )}
              />
            )}
            {section === "appearance" && <ProfileAppearance />}
            {section === "security" && <SecuritySettings cloud={cloud} />}
            {section === "support" && (
              <Suspense fallback={<HelenaLoading compact label={uiText(1014)} />}>
                <SupportChat />
              </Suspense>
            )}
            {section === "notebooks" && <ProfileNotebookPreferences />}
            {section === "notifications" && <ProfileNotifications />}
            {section === "data" && (
              <ProfileDataExport
                workspace={workspace}
                ready={
                  cloud.ready &&
                  cloud.status !== "loading" &&
                  (guest || cloud.authenticated === true)
                }
              />
            )}
            {section === "data" && <PrivacyNotice embedded />}
            {section === "data" && (
              <ActivityPrivacy enabled={!guest && cloud.authenticated === true} />
            )}
            {section === "data" && (
              <section className="profile-card" aria-labelledby="settings-terms-title">
                <span className="section-label">{uiText(1521)}</span>
                <h2 id="settings-terms-title">{uiText(1522)}</h2>
                <p>{uiText(1523)}</p>
              </section>
            )}
            <section
              hidden={section !== "appearance"}
              className="accessibility-settings"
              aria-labelledby="accessibility-title"
            >
              <span className="section-label">{uiText(1524)}</span>
              <h2 id="accessibility-title">{uiText(1525)}</h2>
              <p>{uiText(1526)}</p>
              <label>
                <span>
                  <strong>{uiText(1527)}</strong>
                  <small>{uiText(1528)}</small>
                </span>
                <input
                  type="checkbox"
                  checked={accessibility.reduceMotion}
                  onChange={(e) => changeAccessibility({ reduceMotion: e.target.checked })}
                />
              </label>
              <label>
                <span>
                  <strong>{uiText(1529)}</strong>
                  <small>{uiText(1530)}</small>
                </span>
                <input
                  type="checkbox"
                  checked={accessibility.highlightSelections}
                  onChange={(e) => changeAccessibility({ highlightSelections: e.target.checked })}
                />
              </label>
              <label>
                <span>
                  <strong>{uiText(1531)}</strong>
                  <small>{uiText(1532)}</small>
                </span>
                <input
                  type="checkbox"
                  checked={accessibility.soundEffects}
                  onChange={(event) => changeAccessibility({ soundEffects: event.target.checked })}
                />
              </label>
              {accessibilityError && <p role="alert">{uiText(accessibilityError)}</p>}
              <label>
                <span>
                  <strong>{uiText("Vibrações")}</strong>
                  <small>
                    {uiText("Feedback tátil ao navegar e selecionar, quando o aparelho permitir.")}
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={accessibility.haptics}
                  onChange={(event) => changeAccessibility({ haptics: event.target.checked })}
                />
              </label>
            </section>
            <section
              hidden={section !== "study"}
              className="study-method-settings"
              aria-labelledby="study-method-title"
            >
              <div className="study-method-settings__header">
                <span className="section-label">{uiText(1533)}</span>
                <h2 id="study-method-title">{uiText(1534)}</h2>
              </div>

              <fieldset className="study-duration-options">
                <legend>{uiText(1535)}</legend>
                <div>
                  {([25, 50] as const).map((minutes) => (
                    <button
                      className="secondary-button"
                      type="button"
                      aria-label={uiText(2042, [minutes])}
                      aria-pressed={workspace.focusPreferences.pomodoroMinutes === minutes}
                      onClick={() => updatePomodoroMinutes(minutes)}
                      key={minutes}
                    >
                      {workspace.focusPreferences.pomodoroMinutes === minutes && <PaperCheckIcon />}
                      {minutes} {uiText(1292)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                className="study-long-break secondary-button"
                type="button"
                aria-pressed={workspace.focusPreferences.longBreaks}
                onClick={toggleLongBreaks}
              >
                <span className="study-long-break__check" aria-hidden="true">
                  {workspace.focusPreferences.longBreaks && <PaperCheckIcon />}
                </span>
                <span>
                  <strong>{uiText(1536)}</strong>
                  <small>{uiText(1537)}</small>
                </span>
              </button>
            </section>

            <section
              hidden={section !== "study"}
              className="study-preference-settings"
              aria-labelledby="study-preference-title"
            >
              <div className="study-method-settings__header">
                <span className="section-label">{uiText(1538)}</span>
                <h2 id="study-preference-title">{uiText(1539)}</h2>
                <p>{uiText(1540)}</p>
              </div>

              <fieldset className="study-preference-options">
                <legend>{uiText(1417)}</legend>
                <div>
                  {studyModalities.map((modality) => (
                    <button
                      key={modality}
                      type="button"
                      aria-pressed={hasStudyModality(workspace.studyPreferences, modality)}
                      className="secondary-button"
                      onClick={() => toggleModality(modality)}
                    >
                      {hasStudyModality(workspace.studyPreferences, modality) && <PaperCheckIcon />}
                      {modalityLabels[modality]}
                    </button>
                  ))}
                </div>
              </fieldset>

              {(
                [
                  [
                    "processing",
                    uiText(2043),
                    [
                      ["sequencial", uiText(2014)],
                      ["global", uiText(1421)],
                    ],
                  ],
                  [
                    "rhythm",
                    uiText(1541),
                    [
                      ["focado", uiText(1424)],
                      ["difuso", uiText(2015)],
                    ],
                  ],
                  [
                    "programming",
                    uiText(1109),
                    [
                      ["nenhum", uiText(414)],
                      ["python", uiText(2016)],
                      ["javascript", uiText(2044)],
                      ["python-javascript", uiText(2017)],
                    ],
                  ],
                ] as const
              ).map(([key, title, options]) => (
                <fieldset className="study-preference-options" key={key}>
                  <legend>{title}</legend>
                  <div>
                    {options.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={workspace.studyPreferences[key] === value}
                        className="secondary-button"
                        onClick={() => updateStudyPreferences({ [key]: value })}
                      >
                        {workspace.studyPreferences[key] === value && <PaperCheckIcon />}
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </section>

            {section === "account" &&
              !guest &&
              cloud.authenticated === true &&
              cloud.enabled &&
              cloud.deleteAccount &&
              accountConfirmationName(cloud) && (
                <DeleteAccountPanel
                  accountName={accountConfirmationName(cloud)}
                  onDelete={cloud.deleteAccount}
                />
              )}
          </div>
        </div>
      </div>
    </main>
  );
}
