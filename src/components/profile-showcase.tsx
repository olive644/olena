import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStoredProfile } from "../hooks/use-stored-profile";
import type { WorkspaceState } from "../domain/workspace";
import { ProfileProgress } from "./profile-preferences";
import { NavigationIcon } from "./navigation-icon";
import { useAccessibility } from "../data/accessibility-preferences";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { ProfileEditor, ProfilePaperIcon } from "./profile-editor";
import { recognizeSocialLink, SOCIAL_LABELS } from "../domain/profile-identity";
import { PaperEditorIcon } from "./paper-editor-icon";
import { ProfileAvatarDialog } from "./profile-avatar-dialog";
import { profileAvatarSource } from "../domain/profile-avatars";
import { ProfileStreaks } from "./profile-streaks";
import { useProfileHandle } from "../hooks/use-profile-handle";
import { ProfileCoverArt } from "./profile-cover-art";
import { ProfileCoverDialog } from "./profile-cover-dialog";
import { profileCover } from "../domain/profile-covers";

export function ProfileShowcase({
  children,
  settingsOpen,
  nameFallback,
  guest = false,
  workspace,
}: {
  children: ReactNode;
  settingsOpen: boolean;
  nameFallback: string;
  guest?: boolean;
  workspace?: WorkspaceState;
}) {
  const [profile] = useStoredProfile();
  const { handle } = useProfileHandle(guest);
  const [editing, setEditing] = useState(false);
  const [choosingAvatar, setChoosingAvatar] = useState(false);
  const [choosingCover, setChoosingCover] = useState(false);
  const { reduceMotion } = useAccessibility();
  const chrome = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const coverButton = useRef<HTMLButtonElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = chrome.current;
    const origin = anchor.current;
    if (!element || !origin || settingsOpen) return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const distance = -origin.getBoundingClientRect().top;
      const start = window.scrollY - distance;
      const availableScroll = document.documentElement.scrollHeight - window.innerHeight - start;
      const reservedHeight = element.nextElementSibling?.getBoundingClientRect().height ?? 398;
      const range = Math.max(1, Math.min(reservedHeight, availableScroll));
      const progress = Math.min(1, Math.max(0, distance / range));
      element.style.setProperty(
        "--profile-collapse",
        String(motion?.matches || reduceMotion ? Number(progress > 0.5) : progress),
      );
      element.dataset["compact"] = String(progress >= 1);
      if (toolbar.current) toolbar.current.dataset["compact"] = String(distance > 32);
      const mobile = window.matchMedia?.("(max-width: 600px)").matches ?? window.innerWidth <= 600;
      if (editButton.current) editButton.current.inert = !mobile && progress > 0.2;
      if (coverButton.current) coverButton.current.inert = !mobile && progress > 0.2;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion?.addEventListener?.("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion?.removeEventListener?.("change", schedule);
    };
  }, [settingsOpen, reduceMotion]);
  const name = guest ? nameFallback : profile.name?.trim() || nameFallback;
  return (
    <>
      <div ref={anchor} className="profile-scroll-anchor" aria-hidden="true" />
      <div ref={toolbar} className="profile-toolbar">
        {children}
      </div>
      <div ref={chrome} className="profile-chrome" data-settings={settingsOpen}>
        {!settingsOpen && (
          <section className="profile-cover" aria-label="Seu perfil">
            <div className="profile-cover__art">
              <ProfileCoverArt theme={profileCover(profile.cover)} />
            </div>
            <button
              ref={coverButton}
              className="secondary-button profile-cover__choose"
              type="button"
              onClick={() => setChoosingCover(true)}
              aria-label="Editar capa"
              title="Editar capa"
            >
              <PaperEditorIcon name="pen" />
            </button>
            <div className="profile-cover__shade" />
            <div className="profile-cover__details">
              <div className="profile-cover__identity">
                <h1 className="profile-cover__name" title={name}>
                  {name}
                </h1>
                <button
                  ref={editButton}
                  type="button"
                  className="secondary-button profile-cover__edit"
                  aria-label="Editar perfil"
                  title="Editar perfil"
                  onClick={() => setEditing(true)}
                >
                  <PaperEditorIcon name="pen" />
                </button>
              </div>
              <div className="profile-cover__handle">
                {handle.username && <strong>@{handle.username}</strong>}
                {handle.creks && (
                  <span className="profile-creks" aria-label="Selo CREKS">
                    CREKS
                  </span>
                )}
                {profile.pronouns && <span>{profile.pronouns}</span>}
              </div>
              {profile.bio && (
                <p className="profile-cover__bio" title={profile.bio}>
                  {profile.bio}
                </p>
              )}
              <nav className="profile-cover__networks" aria-label="Redes sociais do perfil">
                {profile.socialLinks?.map((link) => {
                  const social = recognizeSocialLink(link);
                  return social ? (
                    <a
                      key={social.network}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="secondary-button"
                      aria-label={SOCIAL_LABELS[social.network]}
                      title={SOCIAL_LABELS[social.network]}
                    >
                      <ProfilePaperIcon name={social.network} />
                    </a>
                  ) : null;
                })}
              </nav>
              <div className="profile-cover__connections" aria-label="Conexões do perfil">
                <span title="Recurso social em desenvolvimento">
                  <ProfilePaperIcon name="followers" />
                  <strong>0</strong> Seguidores
                </span>
                <span title="Recurso social em desenvolvimento">
                  <ProfilePaperIcon name="following" />
                  <strong>0</strong> Seguindo
                </span>
                <div className="profile-cover__streaks" aria-label="Sequências de estudo">
                  {workspace && <ProfileStreaks workspace={workspace} />}
                </div>
              </div>
            </div>
            <span className="profile-cover__spark profile-cover__spark--one" aria-hidden="true">
              ✦
            </span>
            <span className="profile-cover__spark profile-cover__spark--two" aria-hidden="true">
              ✦
            </span>
          </section>
        )}
        {!settingsOpen && (
          <button
            type="button"
            className="profile-cover__portrait"
            aria-label="Abrir foto do perfil"
            title="Foto do perfil"
            onClick={() => setChoosingAvatar(true)}
          >
            <svg className="profile-cover__bridge" viewBox="0 0 96 32" aria-hidden="true">
              <path fill="var(--line)" d="M0 5h96v8l-6 12-14 7H20L6 25 0 13Z" />
              <path fill="var(--surface)" d="M0 0h96v8l-6 12-14 7H20L6 20 0 8Z" />
            </svg>
            <img
              className="profile-cover__avatar"
              draggable={false}
              src={profileAvatarSource(profile.photoUrl)}
              alt="Sua foto de perfil"
              width="144"
              height="144"
              onError={(event) => {
                event.currentTarget.onerror = null;
                if (!event.currentTarget.src.endsWith("/profile-avatars/helena.webp"))
                  event.currentTarget.src = "/profile-avatars/helena.webp";
              }}
            />
          </button>
        )}
      </div>
      {!settingsOpen && <div className="profile-cover-spacer" aria-hidden="true" />}
      {editing && (
        <ProfileEditor
          profile={{ ...profile, username: handle.username || profile.username || "" }}
          guest={guest}
          onClose={() => setEditing(false)}
        />
      )}
      {choosingAvatar && <ProfileAvatarDialog onClose={() => setChoosingAvatar(false)} />}
      {choosingCover && <ProfileCoverDialog onClose={() => setChoosingCover(false)} />}
    </>
  );
}

export function ProfileOverview({ workspace }: { workspace: WorkspaceState }) {
  const subjectName = (id: string) =>
    workspace.subjects.find((subject) => subject.id === id)?.name || "Estudo";
  const activities = [
    ...workspace.focusSessions.map((session) => ({
      id: `focus:${session.id}`,
      completedAt: session.completedAt,
      title: subjectName(session.subjectId),
      description: `${session.durationMinutes} min de foco`,
      icon: "focus" as const,
    })),
    ...(workspace.practiceActivities ?? []).map((activity) => ({
      id: `practice:${activity.id}`,
      completedAt: activity.completedAt,
      title: activity.islandName,
      description: `Prática nas Ilhas: ${activity.correct} de ${activity.answers} respostas certas`,
      icon: "gamepad" as const,
    })),
    ...workspace.quizAttempts.map((attempt) => ({
      id: `quiz:${attempt.id}`,
      completedAt: attempt.completedAt,
      title: subjectName(attempt.subjectId),
      description: `Questionário: ${attempt.correct} de ${attempt.total} respostas certas`,
      icon: "learn" as const,
    })),
  ]
    .filter((activity) => Number.isFinite(Date.parse(activity.completedAt)))
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
    .slice(0, 5);
  return (
    <div className="profile-overview">
      <div className="profile-settings-grid">
        <ProfileProgress workspace={workspace} />
      </div>
      <section className="profile-activity" aria-labelledby="profile-activity-title">
        <span className="section-label">Sua trajetória</span>
        <h2 id="profile-activity-title">Pequenos passos, novas descobertas</h2>
        {activities.length ? (
          <ol>
            {activities.map((activity) => (
              <li key={activity.id}>
                <NavigationIcon name={activity.icon} />
                <div>
                  <strong>{activity.title}</strong>
                  <span>{activity.description}</span>
                </div>
                <time dateTime={activity.completedAt}>
                  {new Date(activity.completedAt).toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "short",
                    timeZone: agendaTimeZone(),
                  })}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <div className="profile-activity__empty">
            <NavigationIcon name="focus" />
            <p>
              Suas sessões de foco, práticas nas Ilhas e questionários concluídos vão aparecer aqui.
            </p>
          </div>
        )}
        <a className="secondary-button" href="/foco">
          <NavigationIcon name="focus" />
          Ir para o foco
        </a>
      </section>
    </div>
  );
}
