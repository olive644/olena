import type { Dispatch } from "react";
import { PageHeader } from "../components/app-navigation";
import type { WorkspaceAction, WorkspaceState } from "../domain/workspace";

type ProfileViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
};

export function ProfileView({ workspace, dispatch }: ProfileViewProps) {
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

  return (
    <main className="main-content profile-view" id="main-content">
      <PageHeader />
      <header className="profile-settings-heading">
        <span className="section-label">Configurações</span>
        <h1>Personalizar métodos de estudos</h1>
      </header>

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
