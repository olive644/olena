import { uiText, useLanguage, uiLocale } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { requestSupport } from "../data/support";
import { getFirebaseAccountServices } from "../data/firebase-account";
import type { SupportFeed } from "../domain/support";
import { HelenaLoading } from "./helena-loading";

export function SupportChat() {
  useLanguage();

  const [feed, setFeed] = useState<SupportFeed>();
  const [ticket, setTicket] = useState<string>();
  const [inbox, setInbox] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accountRevision, setAccountRevision] = useState(0);
  const requestId = useRef("");
  const generation = useRef(0);
  const sending = useRef(false);
  const responseRevision = useRef(0);
  const openConversation = (nextTicket?: string, nextInbox = false) => {
    generation.current++;
    setFeed(undefined);
    setError("");
    setLoading(true);
    setText("");
    setTicket(nextTicket);
    setInbox(nextInbox);
    requestId.current = "";
  };
  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    void getFirebaseAccountServices()
      .then(({ auth, authApi }) => {
        if (disposed) return;
        let previousUid = auth.currentUser?.uid;
        unsubscribe = authApi.onAuthStateChanged(auth, (user) => {
          if (user?.uid === previousUid) return;
          previousUid = user?.uid;
          generation.current++;
          setFeed(undefined);
          setText("");
          setTicket(undefined);
          setInbox(false);
          requestId.current = "";
          setAccountRevision((value) => value + 1);
        });
      })
      .catch(() => {
        /* The request reports setup/authentication errors. */
      });
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);
  useEffect(() => {
    const current = ++generation.current;
    const abort = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (pending || sending.current || document.visibilityState === "hidden") return;
      pending = true;
      const revision = ++responseRevision.current;
      try {
        const next = await requestSupport({ ...(ticket ? { ticket } : {}), inbox }, abort.signal);
        if (
          current === generation.current &&
          revision === responseRevision.current &&
          !abort.signal.aborted
        ) {
          setFeed(next);
          setError("");
        }
      } catch (cause) {
        if (
          current === generation.current &&
          revision === responseRevision.current &&
          !abort.signal.aborted
        ) {
          setFeed(undefined);
          setError(cause instanceof Error ? cause.message : uiText(1009));
        }
      } finally {
        pending = false;
        if (current === generation.current && !abort.signal.aborted) setLoading(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20000);
    const visible = () => void refresh();
    document.addEventListener("visibilitychange", visible);
    return () => {
      abort.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [ticket, inbox, accountRevision]);
  return (
    <section
      className="profile-card profile-card--wide support-chat"
      aria-labelledby="support-title"
    >
      <span className="section-label">{uiText(1010)}</span>
      <h2 id="support-title">{uiText(1011)}</h2>
      <p>{uiText(1012)}</p>
      {feed?.staff && (
        <div className="support-team-tools">
          <button
            className="secondary-button"
            type="button"
            onClick={() => openConversation(undefined, !inbox)}
          >
            {inbox ? uiText(1949) : uiText(1950)}
          </button>
          {ticket && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => openConversation(undefined, true)}
            >
              {uiText(1013)}
            </button>
          )}
        </div>
      )}
      {loading && <HelenaLoading compact label={uiText(1014)} />}
      {error && <p role="alert">{uiText(error)}</p>}
      {inbox && feed?.inbox && (
        <ul className="support-inbox">
          {feed.inbox.map((item) => (
            <li key={item.id}>
              <button
                className="secondary-button"
                type="button"
                onClick={() => openConversation(item.id)}
              >
                {uiText(1015)}
                {item.id.slice(0, 8)} · {new Date(item.updatedAt).toLocaleString(uiLocale())}
              </button>
            </li>
          ))}
          {!feed.inbox.length && <li>{uiText(1016)}</li>}
        </ul>
      )}
      {!inbox && feed && (
        <>
          <div
            className="support-messages"
            role="log"
            aria-label={uiText(1017)}
            aria-relevant="additions"
            aria-live="polite"
          >
            {feed.ticket?.messages.map((message) => (
              <article
                key={message.id}
                className={`support-message support-message--${message.from}`}
              >
                <strong>{message.from === "team" ? uiText(1951) : uiText(1018)}</strong>
                <p>{message.text}</p>
                <time dateTime={new Date(message.at).toISOString()}>
                  {new Date(message.at).toLocaleString(uiLocale())}
                </time>
              </article>
            ))}
            {!feed.ticket?.messages.length && <p>{uiText(1019)}</p>}
          </div>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (sending.current || !text.trim()) return;
              const current = generation.current;
              sending.current = true;
              responseRevision.current++;
              if (!requestId.current) requestId.current = crypto.randomUUID();
              setBusy(true);
              setError("");
              try {
                const next = await requestSupport({
                  ...(ticket ? { ticket } : {}),
                  text,
                  requestId: requestId.current,
                });
                if (current === generation.current) {
                  setFeed(next);
                  setText("");
                  requestId.current = "";
                }
              } catch (cause) {
                if (current === generation.current)
                  setError(cause instanceof Error ? cause.message : uiText(1020));
              } finally {
                sending.current = false;
                setBusy(false);
              }
            }}
          >
            <label htmlFor="support-message">{uiText(1021)}</label>
            <textarea
              id="support-message"
              rows={3}
              maxLength={2000}
              value={text}
              disabled={busy}
              onChange={(event) => {
                setText(event.target.value);
                requestId.current = "";
              }}
            />
            <small>
              {text.length}
              {uiText(2566)}
            </small>
            <button type="submit" disabled={busy || !text.trim()} className="primary-button">
              {busy ? uiText(584) : uiText(393)}
            </button>
          </form>
          <small>{uiText(1022)}</small>
        </>
      )}
    </section>
  );
}
