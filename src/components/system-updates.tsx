import { uiText, useLanguage, uiLocale } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  parseReadUpdates,
  parseSystemUpdates,
  recentSystemUpdates,
  SYSTEM_UPDATES_READ_KEY,
  type SystemUpdate,
} from "../data/system-updates";
import {
  SYNCED_STORAGE_APPLIED_EVENT,
  SYNCED_STORAGE_EVENT,
  writeSyncedStorage,
} from "../data/synced-storage";
import { useSocialFeed } from "../hooks/use-social-feed";
import { requestSocial, visitSocialProfile } from "../data/profile-social";
import { SocialVisitListener } from "./profile-social";
import type { SocialNotice } from "../domain/profile-social";
import type { WorkspaceState } from "../domain/workspace";
import { PaperCloseIcon } from "./paper-close-icon";
import { PaperArrow } from "./paper-arrow";
import { ProfileStreaks } from "./profile-streaks";
import { useNotificationPreferences } from "../data/notification-preferences";
import { SocialActivityCard, socialNoticeLabel, socialNoticeId } from "./social-activity-card";
import { groupedActivities, groupedNotices, meaningfulActivity } from "../domain/activity-feed";
import "./system-updates.css";
import { useAppRelease, releaseLabel } from "../data/app-release";

export const OPEN_NOTIFICATIONS = "olena:open-notifications";
function storedReadUpdates() {
  try {
    return parseReadUpdates(localStorage.getItem(SYSTEM_UPDATES_READ_KEY));
  } catch {
    return [];
  }
}
function NoticeRow({ notice, onError }: { notice: SocialNotice; onError(text: string): void }) {
  return (
    <article className={`social-follow-row ${notice.read ? "is-read" : "is-unread"}`}>
      <button
        type="button"
        className="social-notice-person"
        aria-label={uiText(1912, [notice.person.username])}
        onClick={() => visitSocialProfile(notice.person.username)}
      >
        <img src={notice.person.photoUrl} alt="" width="40" height="40" />
        <span>
          <strong>{notice.person.name}</strong>
          <small>@{notice.person.username}</small>
          <small>{socialNoticeLabel(notice)}</small>
        </span>
      </button>
      {!notice.kind && (
        <button
          type="button"
          className="secondary-button"
          disabled={notice.person.followed}
          onClick={async () => {
            try {
              await requestSocial({ action: "follow", username: notice.person.username });
            } catch {
              onError(uiText(1030));
            }
          }}
        >
          {notice.person.followed ? uiText(918) : uiText(1917)}
        </button>
      )}
    </article>
  );
}
function NoticeGroup({
  notices,
  onError,
}: {
  notices: SocialNotice[];
  onError(text: string): void;
}) {
  if (notices.length === 1) return <NoticeRow notice={notices[0]!} onError={onError} />;
  return (
    <details className="social-notice-group">
      <summary>
        <span className="social-avatar-stack" aria-hidden="true">
          {notices.slice(0, 3).map((item) => (
            <img
              key={item.person.username}
              src={item.person.photoUrl}
              alt=""
              width="36"
              height="36"
            />
          ))}
        </span>
        <span>
          <strong>
            {uiText(
              notices[0]?.kind === "like"
                ? "{0} pessoas curtiram sua conquista"
                : "{0} pessoas começaram a seguir você",
              [notices.length],
            )}
          </strong>
          <small>
            {uiText("Ver quem são")} <PaperArrow />
          </small>
        </span>
      </summary>
      {notices.map((notice) => (
        <NoticeRow key={socialNoticeId(notice)} notice={notice} onError={onError} />
      ))}
    </details>
  );
}
export function SystemUpdates({
  hideBell = false,
  page = false,
  workspace,
  onBack,
}: {
  hideBell?: boolean;
  page?: boolean;
  workspace?: WorkspaceState;
  onBack?(): void;
}) {
  useLanguage();
  const version = useAppRelease();
  const social = useSocialFeed(true);
  const preferences = useNotificationPreferences();
  const noticeEnabled = (notice: SocialNotice) =>
    notice.kind
      ? preferences.activities && (!notice.activity || meaningfulActivity(notice.activity))
      : preferences.followers;
  const visibleNotifications = (social?.notifications ?? []).filter(noticeEnabled);
  const groups = groupedNotices(visibleNotifications);
  const activities = preferences.activities ? groupedActivities(social?.activities ?? []) : [];
  const [followToast, setFollowToast] = useState<SocialNotice>();
  const seen = useRef<{ owner: string; ids: Set<string> }>({ owner: "", ids: new Set() });
  useEffect(() => {
    if (!social) {
      seen.current = { owner: "", ids: new Set() };
      const reset = window.setTimeout(() => setFollowToast(undefined), 0);
      return () => window.clearTimeout(reset);
    }
    const ids = new Set(social.notifications.map(socialNoticeId));
    const sameOwner = seen.current.owner === social.self.username;
    const next = social.notifications.find(
      (notice) =>
        (notice.kind
          ? preferences.activities && (!notice.activity || meaningfulActivity(notice.activity))
          : preferences.followers) &&
        !notice.read &&
        (sameOwner
          ? !seen.current.ids.has(socialNoticeId(notice))
          : notice.at >= Date.now() - 15000),
    );
    const timer = window.setTimeout(() => {
      seen.current = { owner: social.self.username, ids };
      if (next || !sameOwner || (!preferences.followers && !preferences.activities))
        setFollowToast(next);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [social, preferences.followers, preferences.activities]);
  useEffect(() => {
    if (!followToast) return;
    const timer = window.setTimeout(() => setFollowToast(undefined), 6000);
    return () => window.clearTimeout(timer);
  }, [followToast]);
  const [tab, setTab] = useState<"activities" | "updates">("activities");
  const [updates, setUpdates] = useState<SystemUpdate[]>([]);
  const visibleUpdates = preferences.updates ? updates : [];
  const [read, setRead] = useState(storedReadUpdates);
  const [status, setStatus] = useState(uiText(1023));
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    let active = true,
      pending = false;
    const abort = new AbortController();
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch("/system-updates.json", {
          cache: "no-store",
          signal: abort.signal,
        });
        if (!response.ok) throw new Error("updates");
        const data: unknown = await response.json();
        if (active) {
          setUpdates(recentSystemUpdates(parseSystemUpdates(data)));
          setStatus(uiText(1024));
        }
      } catch {
        if (active) setStatus(uiText(1025));
      } finally {
        pending = false;
      }
    };
    const readStorage = () => setRead(storedReadUpdates());
    void refresh();
    const timer = window.setInterval(() => void refresh(), 300000);
    window.addEventListener("focus", refresh);
    const events = ["storage", SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT];
    events.forEach((event) => window.addEventListener(event, readStorage));
    return () => {
      active = false;
      abort.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      events.forEach((event) => window.removeEventListener(event, readStorage));
    };
  }, []);
  const unread = visibleUpdates.filter((update) => !read.includes(update.id));
  const socialUnread =
    groups.filter((group) => group.some((item) => !item.read)).length +
    visibleNotifications.filter((notice) => notice.kind === "activity" && !notice.read).length;
  return (
    <>
      {!hideBell && !page && (
        <button
          type="button"
          className="appearance-picker__trigger system-updates-trigger"
          aria-label={uiText(1952, [unread.length + socialUnread])}
          onClick={() => window.dispatchEvent(new Event(OPEN_NOTIFICATIONS))}
        >
          <svg className="system-bell" viewBox="0 0 32 32" aria-hidden="true">
            <path fill="currentColor" d="m14 3 4 0 1 4 5 4 1 10 4 3-1 3H4l-1-3 4-3 1-10 5-4z" />
            <path fill="#a779ef" d="m16 7 5 5 1 10-6-2z" />
            <path fill="#facc15" d="m12 28 8 0-2 3h-4z" />
          </svg>
          {unread.length + socialUnread > 0 && (
            <span className="system-update-badge" aria-hidden="true">
              {unread.length + socialUnread}
            </span>
          )}
        </button>
      )}
      {page && (
        <main className="main-content notification-center" id="main-content">
          <div className="notification-center-body">
            <header className="notification-center-heading">
              <div>
                <h1>{uiText("Notificações")}</h1>
                <small>
                  {uiText(1002)} {version}
                </small>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={onBack}
                aria-label={uiText("Voltar ao Espaço")}
              >
                <PaperArrow back />
              </button>
            </header>
            <nav className="notification-tabs" aria-label={uiText("Categorias de notificações")}>
              <button
                type="button"
                className={tab === "activities" ? "primary-button" : "secondary-button"}
                aria-pressed={tab === "activities"}
                onClick={() => setTab("activities")}
              >
                {uiText("Atividades")}
              </button>
              <button
                type="button"
                className={tab === "updates" ? "primary-button" : "secondary-button"}
                aria-pressed={tab === "updates"}
                onClick={() => setTab("updates")}
              >
                {uiText("Novidades")}
              </button>
            </nav>
            <section
              key={tab}
              className="notification-center-content"
              aria-label={uiText(tab === "activities" ? "Atividades" : "Novidades")}
            >
              {tab === "activities" ? (
                <>
                  {workspace && (
                    <section className="notification-streaks" aria-label={uiText("Suas ofensivas")}>
                      <h2>{uiText("Suas ofensivas")}</h2>
                      <ProfileStreaks workspace={workspace} />
                    </section>
                  )}
                  {groups.map((group) => (
                    <NoticeGroup
                      key={group.map(socialNoticeId).join(":")}
                      notices={group}
                      onError={setSaveError}
                    />
                  ))}
                  {activities.map((activity) => (
                    <SocialActivityCard
                      key={`${activity.person.username}:${activity.id}`}
                      activity={activity}
                      own={activity.person.username === social?.self.username}
                    />
                  ))}
                  {!groups.length && !activities.length && (
                    <p>{uiText("As conquistas e conexões dos seus amigos aparecem aqui.")}</p>
                  )}
                </>
              ) : (
                <>
                  {visibleUpdates.map((update) => (
                    <article
                      key={update.id}
                      className={read.includes(update.id) ? "is-read" : "is-unread"}
                    >
                      <strong>{uiText(1031)}</strong>
                      <small>
                        {uiText(1032)} {releaseLabel(update.id)} ·{" "}
                        {new Date(update.date).toLocaleDateString(uiLocale())}
                      </small>
                      <p>{update.title}</p>
                    </article>
                  ))}
                  {!visibleUpdates.length && <p role="status">{uiText(status)}</p>}
                </>
              )}
            </section>
            <button
              type="button"
              className="secondary-button"
              disabled={tab === "updates" ? !unread.length : !socialUnread}
              onClick={async () => {
                try {
                  if (tab === "updates") {
                    const ids = parseReadUpdates(
                      JSON.stringify([
                        ...storedReadUpdates(),
                        ...visibleUpdates.map((item) => item.id),
                      ]),
                    );
                    writeSyncedStorage(SYSTEM_UPDATES_READ_KEY, JSON.stringify(ids));
                    setRead(ids);
                  } else await requestSocial({ action: "read" });
                  setSaveError("");
                } catch {
                  setSaveError(uiText(1033));
                }
              }}
            >
              {uiText(1034)}
            </button>
            {saveError && <p role="alert">{saveError}</p>}
          </div>
        </main>
      )}
      <SocialVisitListener />
      {followToast &&
        noticeEnabled(followToast) &&
        social?.notifications.some(
          (item) => socialNoticeId(item) === socialNoticeId(followToast),
        ) &&
        createPortal(
          <aside key={socialNoticeId(followToast)} className="social-follow-toast" role="status">
            <button
              type="button"
              className="social-notice-person"
              aria-label={uiText(1912, [followToast.person.username])}
              onClick={() => {
                visitSocialProfile(followToast.person.username);
                setFollowToast(undefined);
              }}
            >
              <img
                draggable={false}
                src={followToast.person.photoUrl}
                width="44"
                height="44"
                alt=""
              />
              <span>
                <strong>
                  {followToast.person.name}{" "}
                  {followToast.kind ? socialNoticeLabel(followToast) : uiText(1035)}
                </strong>
                <small>@{followToast.person.username}</small>
              </span>
            </button>
            {!followToast.kind && (
              <button
                type="button"
                className="secondary-button"
                disabled={followToast.person.followed}
                onClick={async () => {
                  try {
                    await requestSocial({
                      action: "follow",
                      username: followToast.person.username,
                    });
                    setFollowToast(undefined);
                  } catch {
                    setSaveError(uiText(1030));
                  }
                }}
              >
                {followToast.person.followed ? uiText(918) : uiText(1917)}
              </button>
            )}
            <button
              type="button"
              className="social-follow-toast-close"
              aria-label={uiText(1036)}
              onClick={() => setFollowToast(undefined)}
            >
              <PaperCloseIcon />
            </button>
            <span className="social-follow-toast-countdown" aria-hidden="true" />
          </aside>,
          document.body,
        )}
    </>
  );
}
