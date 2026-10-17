import { useState } from "react";
import type { WorkspaceState } from "../domain/workspace";
import { useTheme } from "../hooks/use-theme";
import { useStoredProfile } from "../hooks/use-stored-profile";
import { readSyncedStorage, writeSyncedStorage } from "../data/synced-storage";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { useNotebookPreferences } from "../data/notebook-preferences";
import { zonedDateTime } from "../domain/agenda-calendar";
import { ProfileChoices } from "./app-navigation";
import { NotebookPreferenceFields } from "./notebook-settings";
import { NavigationIcon } from "./navigation-icon";
import { PaperDigits } from "./paper-digits";
import { downloadExportBlob } from "../data/paper-export-art";
import { serializeWorkspace, WORKSPACE_STORAGE_KEY } from "../data/local-workspace";
import { ProfileEditor } from "./profile-editor";
import { profileAvatarSource } from "../domain/profile-avatars";

export function ProfileIdentity({
  guest,
  nameFallback = "Seu perfil",
}: {
  guest: boolean;
  nameFallback?: string;
}) {
  const [profile, setProfile] = useStoredProfile();
  const name = guest ? "Guest" : profile.name?.trim() || nameFallback;
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  function save(next: typeof profile) {
    try {
      writeSyncedStorage("helena.profile.v1", JSON.stringify(next));
      setProfile(next);
      setStatus("Perfil atualizado.");
    } catch {
      setStatus("Não foi possível salvar o perfil. Tente novamente.");
    }
  }
  return (
    <section className="profile-card" aria-labelledby="profile-identity-title">
      <span className="section-label">Sua identidade</span>
      <h2 id="profile-identity-title">Como você aparece</h2>
      <div className="profile-identity-preview">
        <img
          src={profileAvatarSource(profile.photoUrl)}
          alt="Avatar atual"
          width="72"
          height="72"
        />
        <strong>{name}</strong>
      </div>
      <button className="secondary-button" type="button" onClick={() => setEditing(true)}>
        Editar perfil
      </button>
      {editing && (
        <ProfileEditor
          profile={{ ...profile, name }}
          guest={guest}
          onClose={() => setEditing(false)}
        />
      )}
      <details className="profile-avatar-options">
        <summary>Escolher avatar</summary>
        <ProfileChoices
          onChoose={(avatar) =>
            save({
              ...profile,
              ...avatar,
              name: guest ? "Guest" : profile.name || avatar.name || "Aluno",
            })
          }
        />
      </details>
      <p>
        Fuso da conta: <strong>{agendaTimeZone().replace(/_/g, " ")}</strong>
      </p>
      {status && <p role="status">{status}</p>}
    </section>
  );
}

export function ProfileAppearance() {
  const { preference, setThemePreference } = useTheme();
  return (
    <section className="profile-card" aria-labelledby="profile-appearance-title">
      <span className="section-label">Aparência</span>
      <h2 id="profile-appearance-title">Seu papel, sua luz</h2>
      <fieldset className="profile-theme-options">
        <legend>Tema do aplicativo</legend>
        {(
          [
            ["light", "Claro"],
            ["dark", "Escuro"],
            ["system", "Sistema"],
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
      <p>O tema acompanha sua conta. Sistema segue a aparência de cada dispositivo.</p>
    </section>
  );
}

export function ProfileNotebookPreferences() {
  const { preferences, changePreference, preferenceError } = useNotebookPreferences();
  return (
    <section className="profile-card profile-card--wide" aria-labelledby="profile-notebooks-title">
      <span className="section-label">Cadernos</span>
      <h2 id="profile-notebooks-title">Escrita e ferramentas</h2>
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
  const [permission, setPermission] = useState(notificationPermission);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section
      className="profile-card profile-card--wide"
      aria-labelledby="profile-notifications-title"
    >
      <span className="section-label">Agenda e notificações</span>
      <h2 id="profile-notifications-title">Lembretes neste navegador</h2>
      <p>
        Estado:{" "}
        <strong>
          {permission === "granted"
            ? "Permitidos"
            : permission === "denied"
              ? "Bloqueados pelo navegador"
              : permission === "unsupported"
                ? "Não disponíveis neste navegador"
                : "Permissão ainda não concedida"}
        </strong>
      </p>
      <p>
        Os lembretes funcionam enquanto o aplicativo estiver aberto. Escolha a antecedência dentro
        de cada evento da Agenda.
      </p>
      {permission === "denied" && (
        <p>
          Para permitir, abra as configurações deste site no navegador. O aplicativo não pode
          remover esse bloqueio.
        </p>
      )}
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
            setError(
              "Não foi possível solicitar a permissão. Confira as configurações do navegador.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Solicitando permissão…" : "Permitir notificações"}
      </button>
      <button
        className="secondary-button"
        type="button"
        onClick={() => setPermission(notificationPermission())}
      >
        Verificar permissão
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export function ProfileProgress({ workspace }: { workspace: WorkspaceState }) {
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
        Meu progresso
      </h2>
      <dl className="profile-progress-metrics">
        {[
          [focus, "Minutos de foco"],
          [correct, "Respostas certas"],
          [activeDays, "Dias com estudo registrado"],
          [workspace.tasks.filter((task) => task.completed).length, "Tarefas concluídas"],
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

export function ProfileDataExport({ workspace }: { workspace: WorkspaceState }) {
  const [error, setError] = useState("");
  return (
    <section className="profile-card" aria-labelledby="profile-data-title">
      <span className="section-label">Seus dados</span>
      <h2 id="profile-data-title">Exportar uma cópia</h2>
      <p>
        Baixa os estudos e preferências disponíveis neste aparelho em JSON. Arquivos que existem
        somente na nuvem não são baixados por esta ação.
      </p>
      <button
        className="secondary-button"
        type="button"
        onClick={() => {
          try {
            const data = {
              exportedAt: new Date().toISOString(),
              storage: {
                ...readSyncedStorage(),
                [WORKSPACE_STORAGE_KEY]: serializeWorkspace(workspace),
              },
            };
            downloadExportBlob(
              new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
              "olena-estudos.json",
            );
            setError("");
          } catch {
            setError("Não foi possível exportar seus dados. Tente novamente.");
          }
        }}
      >
        Exportar meus dados
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
