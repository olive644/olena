import { useState, type Dispatch } from "react";
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
import { NavigationIcon, type NavigationIconName } from "../components/navigation-icon";
import {
  ProfileAppearance,
  ProfileIdentity,
  ProfileNotebookPreferences,
  ProfileNotifications,
  ProfileDataExport,
} from "../components/profile-preferences";
import "./profile-view.css";

const SECTIONS: readonly { id: string; label: string; icon: NavigationIconName }[] = [
  { id: "account", label: "Conta", icon: "profile" },
  { id: "appearance", label: "Aparência e acessibilidade", icon: "theme-light" },
  { id: "study", label: "Estudo e foco", icon: "focus" },
  { id: "notebooks", label: "Cadernos", icon: "notes" },
  { id: "notifications", label: "Agenda e notificações", icon: "planner" },
  { id: "data", label: "Privacidade e dados", icon: "library" },
];

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
  const [section, setSection] = useState("account");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const accessibility = useAccessibility();
  const [accessibilityError, setAccessibilityError] = useState("");
  function changeAccessibility(update: Partial<AccessibilityPreferences>) {
    setAccessibilityError(
      updateAccessibility(update)
        ? ""
        : "Não foi possível salvar neste dispositivo. Tente novamente.",
    );
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
    visual: "Visual",
    auditivo: "Ouvindo e conversando",
    "leitura-escrita": "Lendo e escrevendo",
    pratico: "Praticando",
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
        nameFallback={guest ? GUEST_NAME : cloud.displayName || "Seu perfil"}
      >
        <PageHeader
          showUpdates={false}
          leadingAction={
            <button
              className="appearance-picker__trigger profile-settings-toggle"
              type="button"
              aria-label={settingsOpen ? "Voltar ao perfil" : "Configurações"}
              aria-expanded={settingsOpen}
              aria-controls="profile-settings"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              {settingsOpen ? <PaperArrow back /> : <PaperEditorIcon name="settings" />}
            </button>
          }
        />
      </ProfileShowcase>
      {!settingsOpen && <ProfileOverview workspace={workspace} dispatch={dispatch} />}
      <header className="profile-settings-heading" hidden={!settingsOpen}>
        <h1>Configurações</h1>
      </header>
      <div
        className="profile-settings-layout"
        id="profile-settings"
        hidden={!settingsOpen}
        data-open={settingsOpen}
      >
        <nav className="profile-settings-nav" aria-label="Seções do Perfil">
          {SECTIONS.map((item) => (
            <button
              type="button"
              className={section === item.id ? "primary-button" : "secondary-button"}
              aria-current={section === item.id ? "page" : undefined}
              aria-controls="profile-settings-content"
              onClick={() => setSection(item.id)}
              key={item.id}
            >
              <NavigationIcon
                name={item.icon}
                profileAdaptive
                profileActive={section === item.id}
              />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="profile-settings-content" id="profile-settings-content">
          <h2 className="profile-section-title">
            {SECTIONS.find((item) => item.id === section)?.label}
          </h2>
          <div className="profile-settings-grid" key={section}>
            {section === "account" && (
              <ProfileIdentity
                guest={guest}
                nameFallback={cloud.displayName || "Seu perfil"}
                email={!guest && cloud.authenticated === true ? cloud.email : undefined}
                onSignIn={onSignIn}
                onSignOut={!guest && cloud.authenticated === true ? cloud.signOut : undefined}
              />
            )}
            {section === "appearance" && <ProfileAppearance />}
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
            <section
              hidden={section !== "appearance"}
              className="accessibility-settings"
              aria-labelledby="accessibility-title"
            >
              <span className="section-label">Aplicativo</span>
              <h2 id="accessibility-title">Acessibilidade</h2>
              <p>Vale para todo o aplicativo neste dispositivo.</p>
              <label>
                <span>
                  <strong>Reduzir movimento</strong>
                  <small>
                    Menos giros, saltos e efeitos animados. A preferência do sistema também é
                    respeitada.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={accessibility.reduceMotion}
                  onChange={(e) => changeAccessibility({ reduceMotion: e.target.checked })}
                />
              </label>
              <label>
                <span>
                  <strong>Realçar seleções</strong>
                  <small>
                    Destaques mais fortes nas opções selecionadas, além das cores e dos símbolos.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={accessibility.highlightSelections}
                  onChange={(e) => changeAccessibility({ highlightSelections: e.target.checked })}
                />
              </label>
              <label>
                <span>
                  <strong>Efeitos sonoros</strong>
                  <small>
                    Sons de acerto, erro e recompensas nos minigames e na sala. Não altera as vozes
                    dos exercícios.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={accessibility.soundEffects}
                  onChange={(event) => changeAccessibility({ soundEffects: event.target.checked })}
                />
              </label>
              {accessibilityError && <p role="alert">{accessibilityError}</p>}
            </section>
            <section
              hidden={section !== "study"}
              className="study-method-settings"
              aria-labelledby="study-method-title"
            >
              <div className="study-method-settings__header">
                <span className="section-label">Método Pomodoro</span>
                <h2 id="study-method-title">Seu ritmo de foco</h2>
              </div>

              <fieldset className="study-duration-options">
                <legend>Duração da rodada</legend>
                <div>
                  {([25, 50] as const).map((minutes) => (
                    <button
                      className="secondary-button"
                      type="button"
                      aria-label={`${minutes} minutos`}
                      aria-pressed={workspace.focusPreferences.pomodoroMinutes === minutes}
                      onClick={() => updatePomodoroMinutes(minutes)}
                      key={minutes}
                    >
                      {workspace.focusPreferences.pomodoroMinutes === minutes && <PaperCheckIcon />}
                      {minutes} minutos
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
                  <strong>Pausa longa após 4 rodadas</strong>
                  <small>15 minutos para descansar.</small>
                </span>
              </button>
            </section>

            <section
              hidden={section !== "study"}
              className="study-preference-settings"
              aria-labelledby="study-preference-title"
            >
              <div className="study-method-settings__header">
                <span className="section-label">Seu jeito de estudar</span>
                <h2 id="study-preference-title">Preferências de estudo</h2>
                <p>
                  Estas escolhas organizam recomendações futuras. Você pode combinar modalidades.
                </p>
              </div>

              <fieldset className="study-preference-options">
                <legend>Como você prefere aprender?</legend>
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
                    "Como organizar o estudo?",
                    [
                      ["sequencial", "Passo a passo"],
                      ["global", "Visão geral primeiro"],
                    ],
                  ],
                  [
                    "rhythm",
                    "Qual ritmo combina com você?",
                    [
                      ["focado", "Foco contínuo"],
                      ["difuso", "Alternar estudo e pausas"],
                    ],
                  ],
                  [
                    "programming",
                    "Programação",
                    [
                      ["nenhum", "Agora não"],
                      ["python", "Python"],
                      ["javascript", "JavaScript"],
                      ["python-javascript", "Python e JavaScript"],
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
