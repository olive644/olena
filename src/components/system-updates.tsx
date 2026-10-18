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
import "./system-updates.css";
import { useSocialFeed } from "../hooks/use-social-feed";
import { requestSocial, visitSocialProfile } from "../data/profile-social";
import { SocialVisitListener } from "./profile-social";
import type { SocialNotice } from "../domain/profile-social";
import { PaperCloseIcon } from "./paper-close-icon";
import { useNotificationPreferences } from "../data/notification-preferences";
import { SocialActivityCard, socialNoticeLabel, socialNoticeId } from "./social-activity-card";

function storedReadUpdates() {
  try {
    return parseReadUpdates(localStorage.getItem(SYSTEM_UPDATES_READ_KEY));
  } catch {
    return [];
  }
}

export function SystemUpdates({ hideBell = false }: { hideBell?: boolean }) {
  useLanguage();

  const social = useSocialFeed(true);
  const preferences = useNotificationPreferences();
  const noticeEnabled = (notice: SocialNotice) =>
    notice.kind ? preferences.activities : preferences.followers;
  const visibleNotifications = (social?.notifications ?? []).filter(noticeEnabled);
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
      (n) =>
        (n.kind ? preferences.activities : preferences.followers) &&
        !n.read &&
        (sameOwner ? !seen.current.ids.has(socialNoticeId(n)) : n.at >= Date.now() - 15000),
    );
    const update = window.setTimeout(() => {
      seen.current = { owner: social.self.username, ids };
      if (next || !sameOwner || (!preferences.followers && !preferences.activities))
        setFollowToast(next);
    }, 0);
    return () => window.clearTimeout(update);
  }, [social, preferences.followers, preferences.activities]);
  useEffect(() => {
    if (!followToast) return;
    const timer = window.setTimeout(() => setFollowToast(undefined), 6000);
    return () => window.clearTimeout(timer);
  }, [followToast]);
  const socialUnread = visibleNotifications.filter((notice) => !notice.read).length;
  const [updates, setUpdates] = useState<SystemUpdate[]>([]);
  const visibleUpdates = preferences.updates ? updates : [];
  const [read, setRead] = useState(storedReadUpdates);
  const [status, setStatus] = useState(uiText(1023));
  const [saveError, setSaveError] = useState("");
  const panel = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  useEffect(() => {
    let active = true;
    let pending = false;
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
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && panel.current?.open) {
        panel.current.open = false;
        trigger.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel.current?.contains(event.target) && panel.current)
        panel.current.open = false;
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 300_000);
    window.addEventListener("focus", refresh);
    const events = ["storage", SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT];
    events.forEach((event) => window.addEventListener(event, readStorage));
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      active = false;
      abort.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      events.forEach((event) => window.removeEventListener(event, readStorage));
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  const unread = visibleUpdates.filter((update) => !read.includes(update.id));
  return (
    <>
      {!hideBell && (
        <details className="appearance-picker system-updates" ref={panel}>
          <summary
            className="appearance-picker__trigger system-updates-trigger"
            ref={trigger}
            aria-label={uiText(1952, [unread.length + socialUnread])}
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
          </summary>
          <section
            className="appearance-picker__sheet system-update-sheet"
            aria-label={uiText(1026)}
          >
            <strong>
              {uiText(1027)} <small>{uiText(1028)}</small>
            </strong>
            <div className="system-update-list">
              {visibleNotifications
                .filter((notice) => notice.kind !== "activity")
                .map((notice) => (
                  <article
                    key={socialNoticeId(notice)}
                    className={`social-follow-row ${notice.read ? "is-read" : "is-unread"}`}
                  >
                    <button
                      type="button"
                      className="social-notice-person"
                      aria-label={uiText(1912, [notice.person.username])}
                      onClick={() => {
                        if (panel.current) panel.current.open = false;
                        visitSocialProfile(notice.person.username);
                      }}
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
                            await requestSocial({
                              action: "follow",
                              username: notice.person.username,
                            });
                          } catch (cause) {
                            setSaveError(cause instanceof Error ? cause.message : uiText(1030));
                          }
                        }}
                      >
                        {notice.person.followed ? uiText(918) : uiText(1917)}
                      </button>
                    )}
                  </article>
                ))}
              {preferences.activities &&
                social?.activities?.map((activity) => (
                  <SocialActivityCard
                    key={`${activity.person.username}:${activity.id}`}
                    activity={activity}
                    own={activity.person.username === social.self.username}
                  />
                ))}
              {visibleUpdates.length === 0 &&
                !visibleNotifications.length &&
                !(preferences.activities && social?.activities?.length) && (
                  <p role="status">{uiText(status)}</p>
                )}
              {visibleUpdates.map((update) => (
                <article
                  key={update.id}
                  className={read.includes(update.id) ? "is-read" : "is-unread"}
                >
                  <strong>{uiText(1031)}</strong>
                  <small>
                    {uiText(1032)} {update.version} ·{" "}
                    {new Date(update.date).toLocaleDateString(uiLocale())}
                  </small>
                  <p>{update.title}</p>
                </article>
              ))}
            </div>
            {
              <button
                type="button"
                disabled={unread.length + socialUnread === 0}
                className="secondary-button"
                onClick={async () => {
                  try {
                    const ids = parseReadUpdates(
                      JSON.stringify([
                        ...parseReadUpdates(localStorage.getItem(SYSTEM_UPDATES_READ_KEY)),
                        ...visibleUpdates.map((item) => item.id),
                      ]),
                    );
                    writeSyncedStorage(SYSTEM_UPDATES_READ_KEY, JSON.stringify(ids));
                    setRead(ids);
                    if (socialUnread) await requestSocial({ action: "read" });
                    setSaveError("");
                  } catch {
                    setSaveError(uiText(1033));
                  }
                }}
              >
                {uiText(1034)}
              </button>
            }
            {saveError && <p role="alert">{uiText(saveError)}</p>}
          </section>
        </details>
      )}
      <SocialVisitListener />
      {followToast &&
        noticeEnabled(followToast) &&
        followToast &&
        social?.notifications.some((n) => socialNoticeId(n) === socialNoticeId(followToast)) &&
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
                disabled={
                  social?.notifications.find(
                    (n) => n.person.username === followToast.person.username,
                  )?.person.followed
                }
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
                {social.notifications.find((n) => n.person.username === followToast.person.username)
                  ?.person.followed
                  ? uiText(918)
                  : uiText(1917)}
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
