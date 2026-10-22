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
        setStatus(
          uiText("Denúncia enviada ao time. Acompanhe em Conversar com o time nas configurações."),
        );
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
      setStatus(
        cause instanceof Error
          ? cause.message
          : uiText("Não foi possível concluir. Tente novamente."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="profile-safety" aria-label={uiText("Segurança do perfil")}>
      <details>
        <summary>
          <SettingsIcon name="security" />
          {uiText("Segurança do perfil")}
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
            {uiText("Denunciar usuário")}
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
              <label htmlFor="profile-report-reason">{uiText("O que aconteceu?")}</label>
              <textarea
                id="profile-report-reason"
                required
                minLength={10}
                maxLength={1200}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <p>
                {uiText(
                  "Não inclua senhas ou informações sensíveis. A denúncia será avaliada pelo time, sem punição automática.",
                )}
              </p>
            </>
          ) : (
            <p>
              {uiText(
                "O bloqueio remove as conexões e impede novas interações. Desbloquear não volta a seguir automaticamente.",
              )}
            </p>
          )}
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => setMode(undefined)}
          >
            {uiText("Cancelar")}
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
