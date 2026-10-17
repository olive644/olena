import { useEffect, useRef, useState } from "react";
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

function storedReadUpdates() {
  try {
    return parseReadUpdates(localStorage.getItem(SYSTEM_UPDATES_READ_KEY));
  } catch {
    return [];
  }
}

export function SystemUpdates() {
  const social = useSocialFeed(true);
  const socialUnread = social?.notifications.filter((notice) => !notice.read).length ?? 0;
  const [updates, setUpdates] = useState<SystemUpdate[]>([]);
  const [read, setRead] = useState(storedReadUpdates);
  const [status, setStatus] = useState("Buscando atualizações…");
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
          setStatus("Nenhuma atualização publicada por aqui ainda.");
        }
      } catch {
        if (active)
          setStatus(
            "Não foi possível consultar as atualizações. Tente novamente quando estiver online.",
          );
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
  const unread = updates.filter((update) => !read.includes(update.id));
  return (
    <>
      <details className="appearance-picker system-updates" ref={panel}>
        <summary
          className="appearance-picker__trigger system-updates-trigger"
          ref={trigger}
          aria-label={`Atualizações do sistema, ${unread.length + socialUnread} não lidas`}
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
          aria-label="Notificações de atualização"
        >
          <strong>
            Notificações <small>Beta</small>
          </strong>
          <div className="system-update-list">
            {social?.notifications.map((notice) => (
              <article
                key={`follow:${notice.person.username}:${notice.at}`}
                className={notice.read ? "is-read" : "is-unread"}
              >
                <button
                  type="button"
                  className="social-notice-person"
                  aria-label={`Visitar perfil de @${notice.person.username}`}
                  onClick={() => {
                    if (panel.current) panel.current.open = false;
                    visitSocialProfile(notice.person.username);
                  }}
                >
                  <img src={notice.person.photoUrl} alt="" width="40" height="40" />
                  <span>
                    <strong>{notice.person.name}</strong>
                    <small>@{notice.person.username}</small>
                  </span>
                </button>
                <p>Começou a seguir você.</p>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={notice.person.followed}
                  onClick={async () => {
                    try {
                      await requestSocial({ action: "follow", username: notice.person.username });
                    } catch (cause) {
                      setSaveError(
                        cause instanceof Error
                          ? cause.message
                          : "Não foi possível seguir de volta.",
                      );
                    }
                  }}
                >
                  {notice.person.followed ? "Seguindo" : "Seguir de volta"}
                </button>
              </article>
            ))}
            {updates.length === 0 && !social?.notifications.length && <p role="status">{status}</p>}
            {updates.map((update) => (
              <article
                key={update.id}
                className={read.includes(update.id) ? "is-read" : "is-unread"}
              >
                <strong>Atualização do sistema</strong>
                <small>
                  Versão {update.version} · {new Date(update.date).toLocaleDateString("pt-BR")}
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
                      ...updates.map((item) => item.id),
                    ]),
                  );
                  writeSyncedStorage(SYSTEM_UPDATES_READ_KEY, JSON.stringify(ids));
                  setRead(ids);
                  if (socialUnread) await requestSocial({ action: "read" });
                  setSaveError("");
                } catch {
                  setSaveError("Não foi possível salvar a leitura neste dispositivo.");
                }
              }}
            >
              Marcar como lidas
            </button>
          }
          {saveError && <p role="alert">{saveError}</p>}
        </section>
      </details>
      <SocialVisitListener />
    </>
  );
}
