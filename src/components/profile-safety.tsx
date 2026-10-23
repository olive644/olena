import { useRef, useState } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import type { SocialFeed, SocialProfile } from "../domain/profile-social";
import { requestSocial } from "../data/profile-social";
import { requestSupport } from "../data/support";
import { SettingsIcon } from "./settings-icon";

export function ProfileSafety({
  person,
  onChange,
}: {
  person: SocialProfile;
  onChange(feed: SocialFeed): void;
}) {
  useLanguage();
  const [mode, setMode] = useState<"block" | "report">();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const requestId = useRef("");
  async function submit() {
    if (busy) return;
    setBusy(true);
    setStatus("");
    try {
      if (mode === "report") {
        requestId.current ||= crypto.randomUUID();
        await requestSupport({
          text: `Denúncia de usuário @${person.username}\n${reason.trim()}`,
          requestId: requestId.current,
        });
        setStatus(uiText(2831));
      } else {
        onChange(
          await requestSocial({
            action: person.blocked ? "unblock" : "block",
            username: person.username,
          }),
        );
        setStatus(
          uiText(
            person.blocked
              ? "Usuário desbloqueado. As conexões não são restauradas automaticamente."
              : "Usuário bloqueado. Vocês deixaram de seguir um ao outro.",
          ),
        );
      }
      setMode(undefined);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : uiText(2834));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="profile-safety" aria-label={uiText(2823)}>
      <details>
        <summary>
          <SettingsIcon name="security" />
          {uiText(2823)}
        </summary>
        <div className="profile-safety-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => setMode("block")}
          >
            {uiText(person.blocked ? "Desbloquear usuário" : "Bloquear usuário")}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => {
              setMode("report");
              requestId.current = "";
            }}
          >
            {uiText(2826)}
          </button>
        </div>
      </details>
      {mode && (
        <form
          className="profile-safety-confirm"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <h3>
            {uiText(
              mode === "report"
                ? "Denunciar usuário"
                : person.blocked
                  ? "Desbloquear usuário"
                  : "Bloquear usuário",
            )}{" "}
            @{person.username}
          </h3>
          {mode === "report" ? (
            <>
              <label htmlFor="profile-report-reason">{uiText(2827)}</label>
              <textarea
                id="profile-report-reason"
                required
                minLength={10}
                maxLength={1200}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <p>{uiText(2828)}</p>
            </>
          ) : (
            <p>{uiText(2829)}</p>
          )}
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => setMode(undefined)}
          >
            {uiText(155)}
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={busy || (mode === "report" && reason.trim().length < 10)}
          >
            {uiText(busy ? "Enviando" : "Confirmar")}
          </button>
        </form>
      )}
      {status && <p role="status">{status}</p>}
    </section>
  );
}
