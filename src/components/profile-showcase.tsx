import { useEffect, useRef, type ReactNode } from "react";
import { useStoredProfile } from "../hooks/use-stored-profile";
import type { WorkspaceState } from "../domain/workspace";
import { ProfileProgress } from "./profile-preferences";
import { NavigationIcon } from "./navigation-icon";
import { useAccessibility } from "../data/accessibility-preferences";
import { agendaTimeZone } from "../data/agenda-time-zone";

export function ProfileShowcase({
  children,
  settingsOpen,
  nameFallback,
  guest = false,
}: {
  children: ReactNode;
  settingsOpen: boolean;
  nameFallback: string;
  guest?: boolean;
}) {
  const [profile] = useStoredProfile();
  const { reduceMotion } = useAccessibility();
  const chrome = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
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
      <div ref={chrome} className="profile-chrome" data-settings={settingsOpen}>
        {!settingsOpen && (
          <section className="profile-cover" aria-label="Seu perfil">
            <img
              className="profile-cover__art"
              src="/room-art/profile-people.webp"
              alt=""
              width="1800"
              height="600"
              fetchPriority="high"
            />
            <div className="profile-cover__shade" />
            <div className="profile-cover__intro">
              <span className="section-label">Perfil</span>
              <h1>Seu espaço, do seu jeito.</h1>
            </div>
            <img
              className="profile-cover__avatar"
              src={profile.photoUrl || "/profile-avatars/helena.webp"}
              alt="Sua foto de perfil"
              width="112"
              height="112"
              onError={(event) => {
                event.currentTarget.onerror = null;
                if (!event.currentTarget.src.endsWith("/profile-avatars/helena.webp"))
                  event.currentTarget.src = "/profile-avatars/helena.webp";
              }}
            />
            <strong className="profile-cover__name" title={name}>
              {name}
            </strong>
            <span className="profile-cover__caption">
              Cada descoberta faz parte da sua história.
            </span>
            <span className="profile-cover__spark profile-cover__spark--one" aria-hidden="true">
              ✦
            </span>
            <span className="profile-cover__spark profile-cover__spark--two" aria-hidden="true">
              ✦
            </span>
          </section>
        )}
        {children}
      </div>
      {!settingsOpen && <div className="profile-cover-spacer" aria-hidden="true" />}
    </>
  );
}

export function ProfileOverview({ workspace }: { workspace: WorkspaceState }) {
  const sessions = [...workspace.focusSessions]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 5);
  return (
    <div className="profile-overview">
      <div className="profile-settings-grid">
        <ProfileProgress workspace={workspace} />
      </div>
      <section className="profile-activity" aria-labelledby="profile-activity-title">
        <span className="section-label">Sua trajetória</span>
        <h2 id="profile-activity-title">Pequenos passos, novas descobertas</h2>
        {sessions.length ? (
          <ol>
            {sessions.map((session) => (
              <li key={session.id}>
                <NavigationIcon name="focus" />
                <div>
                  <strong>
                    {workspace.subjects.find((subject) => subject.id === session.subjectId)?.name ||
                      "Estudo"}
                  </strong>
                  <span>{session.durationMinutes} min de foco</span>
                </div>
                <time dateTime={session.completedAt}>
                  {new Date(session.completedAt).toLocaleDateString("pt-BR", {
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
              Seu próximo passo começa com um momento de foco. As sessões concluídas vão aparecer
              aqui.
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
