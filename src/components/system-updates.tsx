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

function storedReadUpdates() {
  try {
    return parseReadUpdates(localStorage.getItem(SYSTEM_UPDATES_READ_KEY));
  } catch {
    return [];
  }
}

export function SystemUpdates() {
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
    <details className="appearance-picker system-updates" ref={panel}>
      <summary
        className="appearance-picker__trigger system-updates-trigger"
        ref={trigger}
        aria-label={`Atualizações do sistema, ${unread.length} não lidas`}
      >
        <svg className="system-bell" viewBox="0 0 32 32" aria-hidden="true">
          <path fill="currentColor" d="m14 3 4 0 1 4 5 4 1 10 4 3-1 3H4l-1-3 4-3 1-10 5-4z" />
          <path fill="#a779ef" d="m16 7 5 5 1 10-6-2z" />
          <path fill="#facc15" d="m12 28 8 0-2 3h-4z" />
        </svg>
        {unread.length > 0 && (
          <span className="system-update-badge" aria-hidden="true">
            {unread.length}
          </span>
        )}
      </summary>
      <section
        className="appearance-picker__sheet system-update-sheet"
        aria-label="Notificações de atualização"
      >
        <strong>
          Atualizações do sistema <small>Beta</small>
        </strong>
        <div className="system-update-list">
          {updates.length === 0 && <p role="status">{status}</p>}
          {updates.map((update) => (
            <article key={update.id} className={read.includes(update.id) ? "is-read" : "is-unread"}>
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
            disabled={unread.length === 0}
            className="secondary-button"
            onClick={() => {
              try {
                const ids = parseReadUpdates(
                  JSON.stringify([
                    ...parseReadUpdates(localStorage.getItem(SYSTEM_UPDATES_READ_KEY)),
                    ...updates.map((item) => item.id),
                  ]),
                );
                writeSyncedStorage(SYSTEM_UPDATES_READ_KEY, JSON.stringify(ids));
                setRead(ids);
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
  );
}
