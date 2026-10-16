import { useState, type Dispatch } from "react";
import {
  useAccessibility,
  updateAccessibility,
  type AccessibilityPreferences,
} from "../data/accessibility-preferences";
import { PageHeader } from "../components/app-navigation";
import { ProfileShowcase, ProfileOverview } from "../components/profile-showcase";
import { PaperEditorIcon } from "../components/paper-editor-icon";
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
  ProfileProgress,
  ProfileDataExport,
} from "../components/profile-preferences";
import "./profile-view.css";

const SECTIONS: readonly { id: string; label: string; icon: NavigationIconName }[] = [
  { id: "account", label: "Conta", icon: "profile" },
  { id: "progress", label: "Meu progresso", icon: "xp" },
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
  history,
  onRestoreSnapshot,
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
        workspace={workspace}
        settingsOpen={settingsOpen}
        guest={guest}
        nameFallback={guest ? GUEST_NAME : cloud.displayName || "Seu perfil"}
      >
        <PageHeader
          leadingAction={
            <button
              className="appearance-picker__trigger profile-settings-toggle"
              type="button"
              aria-label={settingsOpen ? "Fechar configurações" : "Configurações"}
              aria-expanded={settingsOpen}
              aria-controls="profile-settings"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <PaperEditorIcon name="settings" />
            </button>
          }
        />
      </ProfileShowcase>
      {!settingsOpen && <ProfileOverview workspace={workspace} />}
      <header className="profile-settings-heading" hidden={!settingsOpen}>
        <h1>Configurações</h1>
      </header>
      <div className="profile-settings-layout" id="profile-settings" hidden={!settingsOpen}>
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
            {section === "account" && <ProfileIdentity guest={guest} />}
            {section === "progress" && <ProfileProgress workspace={workspace} />}
            {section === "appearance" && <ProfileAppearance />}
            {section === "notebooks" && <ProfileNotebookPreferences />}
            {section === "notifications" && <ProfileNotifications />}
            {section === "data" && <ProfileDataExport workspace={workspace} />}
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
              hidden={section !== "account"}
              className="account-sync-settings"
              aria-labelledby="account-sync-title"
            >
              <div>
                <span className="section-label">Conta e sincronização</span>
                <h2 id="account-sync-title">Seus estudos em todos os dispositivos</h2>
                <p>
                  {guest
                    ? "Você está como convidado. Seus estudos ficam somente neste aparelho. Entre com Google para usá-los também em outros dispositivos."
                    : cloud.status === "signed-out"
                      ? "Entre com Google para sincronizar seus estudos com sua conta."
                      : !cloud.enabled
                        ? "A nuvem ainda não está configurada. Seus estudos continuam salvos somente neste dispositivo."
                        : cloud.status === "offline"
                          ? "Sem conexão. Suas alterações ficam neste dispositivo e serão enviadas quando a internet voltar."
                          : cloud.status === "conflict"
                            ? "Conflito conciliado: suas alterações locais foram preservadas e a versão remota foi guardada neste dispositivo."
                            : cloud.status === "syncing" || cloud.status === "loading"
                              ? "Sincronizando suas alterações com segurança…"
                              : "Computador e celular usam a mesma conta Google e recebem as alterações automaticamente."}
                </p>
              </div>
              <dl>
                <div>
                  <dt>Conta</dt>
                  <dd>
                    {guest
                      ? `${GUEST_NAME} (convidado)`
                      : cloud.enabled
                        ? cloud.status === "signed-out"
                          ? "Nenhuma conta conectada"
                          : cloud.displayName || cloud.email || "Conta Google conectada"
                        : "Somente neste dispositivo"}
                  </dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd data-sync-status={cloud.status}>
                    {guest
                      ? "Somente neste aparelho"
                      : !cloud.enabled
                        ? "Nuvem indisponível"
                        : cloud.status === "signed-out"
                          ? "Aguardando login"
                          : cloud.status === "offline"
                            ? "Aguardando conexão"
                            : cloud.status === "conflict"
                              ? "Conflito preservado"
                              : cloud.status === "syncing" || cloud.status === "loading"
                                ? "Sincronizando"
                                : "Sincronizado"}
                  </dd>
                </div>
                <div>
                  <dt>Última atualização</dt>
                  <dd>
                    {cloud.lastSyncedAt
                      ? new Date(cloud.lastSyncedAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Ainda não sincronizado"}
                  </dd>
                </div>
              </dl>
              <div className="account-sync-settings__actions">
                {guest || cloud.status === "signed-out" ? (
                  <button type="button" disabled={!onSignIn} onClick={onSignIn}>
                    Entrar com Google
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={!cloud.syncNow || cloud.status === "syncing"}
                      onClick={cloud.syncNow}
                    >
                      Sincronizar agora
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={!cloud.signOut}
                      onClick={() => void cloud.signOut?.()}
                    >
                      Sair desta conta
                    </button>
                  </>
                )}
              </div>
            </section>

            <section
              hidden={section !== "data"}
              className="workspace-history-settings"
              aria-labelledby="workspace-history-title"
            >
              <div>
                <span className="section-label">Recuperação local</span>
                <h2 id="workspace-history-title">Histórico dos estudos</h2>
                <p>
                  Guardamos até seis versões recentes neste dispositivo para recuperar uma versão
                  anterior.
                </p>
              </div>
              {history.length === 0 ? (
                <p className="workspace-history-empty">
                  O histórico será criado após a próxima alteração.
                </p>
              ) : (
                <ol className="workspace-history-list">
                  {history.map((entry, index) => (
                    <li key={entry.id}>
                      <div>
                        <strong>{index === 0 ? "Versão atual" : `Versão anterior ${index}`}</strong>
                        <small>
                          {new Date(entry.savedAt).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </small>
                      </div>
                      {index > 0 && (
                        <button type="button" onClick={() => onRestoreSnapshot(entry)}>
                          Restaurar
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              )}
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
                      className={
                        workspace.focusPreferences.pomodoroMinutes === minutes
                          ? "is-active"
                          : undefined
                      }
                      type="button"
                      aria-label={`${minutes} minutos`}
                      aria-pressed={workspace.focusPreferences.pomodoroMinutes === minutes}
                      onClick={() => updatePomodoroMinutes(minutes)}
                      key={minutes}
                    >
                      {minutes} minutos
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                className={`study-long-break${workspace.focusPreferences.longBreaks ? " is-active" : ""}`}
                type="button"
                aria-pressed={workspace.focusPreferences.longBreaks}
                onClick={toggleLongBreaks}
              >
                <i aria-hidden="true" />
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
                      className={
                        hasStudyModality(workspace.studyPreferences, modality)
                          ? "is-active"
                          : undefined
                      }
                      onClick={() => toggleModality(modality)}
                    >
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
                        className={
                          workspace.studyPreferences[key] === value ? "is-active" : undefined
                        }
                        onClick={() => updateStudyPreferences({ [key]: value })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </section>

            {section === "data" &&
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
