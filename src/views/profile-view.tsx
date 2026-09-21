import type { Dispatch } from "react";
import { PageHeader } from "../components/app-navigation";
import type { WorkspaceAction, WorkspaceState } from "../domain/workspace";
import {
  hasStudyModality,
  studyModalities,
  type StudyModality,
  type StudyPreferences,
} from "../domain/study-preferences";
import type { CloudSyncState } from "../hooks/use-cloud-sync";

type ProfileViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  cloud: CloudSyncState;
};

export function ProfileView({ workspace, dispatch, cloud }: ProfileViewProps) {
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
      <PageHeader />
      <header className="profile-settings-heading">
        <span className="section-label">Configurações</span>
        <h1>Personalizar métodos de estudos</h1>
      </header>

      <section className="account-sync-settings" aria-labelledby="account-sync-title">
        <div>
          <span className="section-label">Conta e sincronização</span>
          <h2 id="account-sync-title">Seus estudos em todos os dispositivos</h2>
          <p>
            {!cloud.enabled
              ? "A nuvem ainda não está configurada. Seus estudos continuam salvos somente neste dispositivo."
              : cloud.status === "offline"
                ? "Sem conexão. Suas alterações ficam neste dispositivo e serão enviadas quando a internet voltar."
                : cloud.status === "syncing" || cloud.status === "loading"
                  ? "Sincronizando suas alterações com segurança…"
                  : "Computador e celular usam a mesma conta Google e recebem as alterações automaticamente."}
          </p>
        </div>
        <dl>
          <div>
            <dt>Conta</dt>
            <dd>
              {cloud.enabled
                ? cloud.displayName || cloud.email || "Conta Google conectada"
                : "Somente neste dispositivo"}
            </dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd data-sync-status={cloud.status}>
              {!cloud.enabled
                ? "Nuvem indisponível"
                : cloud.status === "offline"
                  ? "Aguardando conexão"
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
        </div>
      </section>

      <section className="study-method-settings" aria-labelledby="study-method-title">
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
                  workspace.focusPreferences.pomodoroMinutes === minutes ? "is-active" : undefined
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

      <section className="study-preference-settings" aria-labelledby="study-preference-title">
        <div className="study-method-settings__header">
          <span className="section-label">Seu jeito de estudar</span>
          <h2 id="study-preference-title">Preferências de estudo</h2>
          <p>Estas escolhas organizam recomendações futuras. Você pode combinar modalidades.</p>
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
                  hasStudyModality(workspace.studyPreferences, modality) ? "is-active" : undefined
                }
                onClick={() => toggleModality(modality)}
              >
                {modalityLabels[modality]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="study-preference-options">
          <legend>Como organizar o estudo?</legend>
          <div>
            <button
              type="button"
              aria-pressed={workspace.studyPreferences.processing === "sequencial"}
              className={
                workspace.studyPreferences.processing === "sequencial" ? "is-active" : undefined
              }
              onClick={() => updateStudyPreferences({ processing: "sequencial" })}
            >
              Passo a passo
            </button>
            <button
              type="button"
              aria-pressed={workspace.studyPreferences.processing === "global"}
              className={
                workspace.studyPreferences.processing === "global" ? "is-active" : undefined
              }
              onClick={() => updateStudyPreferences({ processing: "global" })}
            >
              Visão geral primeiro
            </button>
          </div>
        </fieldset>

        <fieldset className="study-preference-options">
          <legend>Qual ritmo combina com você?</legend>
          <div>
            <button
              type="button"
              aria-pressed={workspace.studyPreferences.rhythm === "focado"}
              className={workspace.studyPreferences.rhythm === "focado" ? "is-active" : undefined}
              onClick={() => updateStudyPreferences({ rhythm: "focado" })}
            >
              Foco contínuo
            </button>
            <button
              type="button"
              aria-pressed={workspace.studyPreferences.rhythm === "difuso"}
              className={workspace.studyPreferences.rhythm === "difuso" ? "is-active" : undefined}
              onClick={() => updateStudyPreferences({ rhythm: "difuso" })}
            >
              Alternar estudo e pausas
            </button>
          </div>
        </fieldset>

        <fieldset className="study-preference-options">
          <legend>Programação</legend>
          <div>
            {(
              [
                ["nenhum", "Agora não"],
                ["python", "Python"],
                ["javascript", "JavaScript"],
                ["python-javascript", "Python e JavaScript"],
              ] as const
            ).map(([programming, label]) => (
              <button
                key={programming}
                type="button"
                aria-pressed={workspace.studyPreferences.programming === programming}
                className={
                  workspace.studyPreferences.programming === programming ? "is-active" : undefined
                }
                onClick={() => updateStudyPreferences({ programming })}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <section
        className="profile-coming-soon profile-coming-soon--compact"
        aria-labelledby="profile-future-title"
      >
        <h2 id="profile-future-title">Em produção</h2>
        <p>Mais informações em breve.</p>
      </section>
    </main>
  );
}
