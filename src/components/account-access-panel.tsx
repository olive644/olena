import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uiText } from "../i18n/runtime";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { accountAuthError, setAccountLanguage, type AccountServices } from "../data/account-auth";
import { readAccessPreferences, writeAccessPreferences } from "../data/account-access-preferences";
import { EmailAuthForm } from "./email-auth-form";
import { AccountProviderIcon } from "./account-provider-icon";
import { PaperCheckIcon } from "./paper-check-icon";
import { HelenaLoading } from "./helena-loading";
import { LibraryDialog } from "./library-dialog";
import { createMathSound } from "../data/math-sound";
import "./account-access.css";
import "../views/google-login.css";
import "../views/auth-paper.css";

// Login considerado recente: o servidor exige menos de 240 s; aqui vale menos, para não falhar na ida.
function recentLogin(authTime: string | undefined): boolean {
  const at = authTime ? Date.parse(authTime) : NaN;
  return Number.isFinite(at) && Date.now() - at >= 0 && Date.now() - at < 200000;
}
type DiscordLink = { uid: string; linked?: boolean; name?: string; failed?: boolean };
export function AccountAccessPanel({
  verificationOnly = false,
  onSignOut,
}: {
  verificationOnly?: boolean;
  onSignOut?: () => Promise<void>;
}) {
  const [services, setServices] = useState<AccountServices>();
  const [, refresh] = useState(0);
  const [message, setMessage] = useState("");
  const [consentOwner, setConsentOwner] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [resetSentAt, setResetSentAt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [notice, setNotice] = useState(false);
  const [passwordOwner, setPasswordOwner] = useState<string>();
  const [googleStatus, setGoogleStatus] = useState<{ uid: string; linked: boolean }>();
  const [verified, setVerified] = useState(false);
  const [discord, setDiscord] = useState<DiscordLink>();
  const [statusRefresh, setStatusRefresh] = useState(0);
  const [unlink, setUnlink] = useState<{ uid: string; provider: "google" | "discord" }>();
  const [confirmPassword, setConfirmPassword] = useState("");
  // Vincular um método e encerrar sessões exigem um login recente, como desvincular.
  const [reauth, setReauth] = useState<{ uid: string; action: "discord" | "sessions" }>();
  const sound = useRef<ReturnType<typeof createMathSound> | null>(null);
  useEffect(() => () => sound.current?.dispose(), []);
  function cue(success = false) {
    sound.current ??= createMathSound();
    sound.current.unlock();
    sound.current.play(success ? "correct" : "start");
  }
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    let previousUid: string | undefined;
    let unsubscribe: (() => void) | undefined;
    const controller = new AbortController();
    void getFirebaseAccountServices()
      .then((value) => {
        if (!active) return;
        setServices(value);
        const update = () => {
          if (!active) return;
          const uid = value.auth.currentUser?.uid;
          refresh((n) => n + 1);
          if (uid === previousUid) return;
          previousUid = uid;
          setPasswordOwner(undefined);
          setGoogleStatus(undefined);
          setVerified(false);
          setDiscord(undefined);
          setNotice(false);
          setUnlink(undefined);
          setConfirmPassword("");
          if (!uid) {
            setConsentOwner(undefined);
            return;
          }
          const preferences = readAccessPreferences(localStorage, uid);
          setConsentOwner(preferences.consent ? uid : undefined);
          setResetSentAt(preferences.resetSentAt);
          if (!verificationOnly) {
            void (async () => {
              try {
                const token = await value.auth.currentUser!.getIdToken();
                if (!active || value.auth.currentUser?.uid !== uid) return;
                const response = await fetch("/api/olena?action=account-auth&step=methods", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                  signal: controller.signal,
                });
                const payload: unknown = response.ok ? await response.json() : null;
                if (!payload || typeof payload !== "object" || !("discord" in payload))
                  throw new Error("methods");
                const result = payload.discord;
                if (
                  !result ||
                  typeof result !== "object" ||
                  !("linked" in result) ||
                  typeof result.linked !== "boolean"
                )
                  throw new Error("methods");
                if (active && value.auth.currentUser?.uid === uid)
                  if ("password" in payload && payload.password === true) setPasswordOwner(uid);
                if (
                  active &&
                  value.auth.currentUser?.uid === uid &&
                  "google" in payload &&
                  typeof payload.google === "boolean"
                )
                  setGoogleStatus({ uid, linked: payload.google });
                if (active && value.auth.currentUser?.uid === uid)
                  setDiscord({
                    uid,
                    linked: result.linked,
                    ...("name" in result && typeof result.name === "string"
                      ? { name: result.name.slice(0, 80) }
                      : {}),
                  });
              } catch {
                if (active && value.auth.currentUser?.uid === uid)
                  setDiscord({ uid, failed: true });
              }
            })();
          }
        };
        update();
        if (typeof value.authApi.onIdTokenChanged === "function")
          unsubscribe = value.authApi.onIdTokenChanged(value.auth, update);
        const current = value.auth.currentUser;
        if (!verificationOnly && current && typeof value.authApi.reload === "function")
          void value.authApi
            .reload(current)
            .then(update)
            .catch(() => {});
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.abort();
      unsubscribe?.();
    };
  }, [verificationOnly, statusRefresh]);
  useEffect(() => {
    if (!resetSentAt) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClock(now);
      if (now - resetSentAt >= 60000) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resetSentAt]);
  const user = services?.auth.currentUser;
  const accepted = !!user && consentOwner === user.uid;
  const needsVerification = !!user?.email && !user.emailVerified && !verified;
  const password =
    user?.providerData.some((entry) => entry.providerId === "password") ||
    (!!user && passwordOwner === user.uid);
  const google =
    googleStatus?.uid === user?.uid && !googleStatus?.linked
      ? undefined
      : (user?.providerData.find((entry) => entry.providerId === "google.com") ??
        (googleStatus?.uid === user?.uid && googleStatus?.linked
          ? { displayName: uiText("Associado"), email: "" }
          : undefined));
  const discordState = discord?.uid === user?.uid ? discord : undefined;
  const cooling = resetSentAt > 0 && clock - resetSentAt < 60000;
  if (!user || (verificationOnly && !needsVerification)) return null;
  async function run(action: () => Promise<unknown>) {
    if (pending.current || !user || services?.auth.currentUser?.uid !== user.uid) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      setAccountLanguage(services);
      await action();
      refresh((n) => n + 1);
    } catch (cause) {
      if (services?.auth.currentUser?.uid === user?.uid) setMessage(accountAuthError(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function startDiscord(token: string) {
    if (!user || services?.auth.currentUser?.uid !== user.uid) throw new Error("owner-changed");
    const response = await fetch("/api/olena?action=account-auth&step=start", {
      method: "POST",
      credentials: "same-origin",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      const failure: unknown = await response.json().catch(() => null);
      if (
        failure &&
        typeof failure === "object" &&
        "error" in failure &&
        failure.error === "recent-login"
      ) {
        setReauth({ uid: user.uid, action: "discord" });
        return;
      }
    }
    if (!response.ok) throw new Error("discord-link");
    const payload: unknown = await response.json();
    if (
      !payload ||
      typeof payload !== "object" ||
      !("url" in payload) ||
      typeof payload.url !== "string"
    )
      throw new Error("discord-link");
    const target = new URL(payload.url);
    if (target.origin !== "https://discord.com" || target.pathname !== "/oauth2/authorize")
      throw new Error("discord-link");
    window.location.assign(target.toString());
  }
  async function reconfirm() {
    if (!user) return;
    if (google)
      await services!.authApi.reauthenticateWithPopup(
        user,
        new services!.authApi.GoogleAuthProvider(),
      );
    else if (password && user.email)
      await services!.authApi.reauthenticateWithCredential(
        user,
        services!.authApi.EmailAuthProvider.credential(user.email, confirmPassword),
      );
  }
  return (
    <section
      className={
        verificationOnly ? "account-access account-access--verification" : "account-access"
      }
      aria-label={uiText("Segurança e acesso")}
    >
      <h2>{verificationOnly ? uiText("Confirme seu e-mail") : uiText("Segurança e acesso")}</h2>
      {needsVerification && (
        <div className="account-access__verification">
          <p>{uiText("Confirme seu e-mail para comprovar que ele pertence a você.")}</p>
          <button
            type="button"
            className="account-access__action"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (Date.now() - sentAt < 60000) {
                  setMessage(uiText("Aguarde um minuto antes de reenviar."));
                  return;
                }
                await services!.authApi.sendEmailVerification(user);
                setSentAt(Date.now());
                setMessage(
                  uiText("E-mail de verificação enviado. Confira também a caixa de spam."),
                );
              })
            }
          >
            {uiText("Reenviar verificação")}
          </button>
          <button
            type="button"
            className="account-access__action"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await services!.authApi.reload(user);
                await user.getIdToken(true);
                setVerified(user.emailVerified);
                setMessage(
                  user.emailVerified
                    ? uiText("E-mail confirmado.")
                    : uiText(
                        "A confirmação ainda não foi encontrada. Abra o link recebido e tente novamente.",
                      ),
                );
              })
            }
          >
            {uiText("Já confirmei meu e-mail")}
          </button>
        </div>
      )}
      {!verificationOnly && (
        <>
          <p>
            {uiText("Adicione um método à conta atual para manter os mesmos estudos e conquistas.")}
          </p>
          <label className="account-access__consent">
            <input
              className="paper-checkbox"
              type="checkbox"
              checked={accepted}
              onChange={(event) => {
                setConsentOwner(event.target.checked ? user.uid : undefined);
                writeAccessPreferences(localStorage, user.uid, { consent: event.target.checked });
              }}
            />
            {uiText("Autorizo associar novos métodos de acesso à minha conta.")}
          </label>
          <div className="account-access__providers">
            <div className="account-access__provider">
              <button
                type="button"
                className="account-access__provider-button"
                data-linked={!!google}
                aria-label={uiText(google ? "Google associado" : "Associar Google")}
                disabled={busy || (!google && !accepted)}
                onClick={() => {
                  if (google) {
                    cue();
                    setUnlink({ uid: user.uid, provider: "google" });
                    return;
                  }
                  void run(async () => {
                    await services!.authApi.linkWithPopup(
                      user,
                      new services!.authApi.GoogleAuthProvider(),
                    );
                    await services!.authApi.reload(user);
                    setStatusRefresh((n) => n + 1);
                    setMessage(uiText("Método associado à sua conta."));
                  });
                }}
              >
                <AccountProviderIcon provider="google" />
                {google && (
                  <span className="account-access__check">
                    <PaperCheckIcon size={18} />
                  </span>
                )}
              </button>
              <strong>{uiText("Google")}</strong>
              <span title={google?.displayName || google?.email || undefined}>
                {google?.displayName || google?.email || uiText("Não associado")}
              </span>
            </div>
            <div className="account-access__provider">
              <button
                type="button"
                className="account-access__provider-button"
                data-linked={discordState?.linked === undefined ? "unknown" : discordState.linked}
                aria-label={uiText(
                  discordState?.failed
                    ? "Tentar novamente"
                    : discordState?.linked
                      ? "Discord associado"
                      : "Associar Discord",
                )}
                disabled={
                  busy ||
                  (!discordState?.failed &&
                    !discordState?.linked &&
                    (!accepted || discordState?.linked !== false))
                }
                onClick={() => {
                  if (discordState?.linked) {
                    cue();
                    setUnlink({ uid: user.uid, provider: "discord" });
                    return;
                  }
                  if (discordState?.failed) {
                    setStatusRefresh((n) => n + 1);
                    return;
                  }
                  void run(async () => {
                    const session = await user.getIdTokenResult();
                    if (!recentLogin(session.authTime)) {
                      setReauth({ uid: user.uid, action: "discord" });
                      return;
                    }
                    await startDiscord(session.token);
                  });
                }}
              >
                <AccountProviderIcon provider="discord" />
                {discordState?.linked && (
                  <span className="account-access__check">
                    <PaperCheckIcon size={18} />
                  </span>
                )}
              </button>
              <strong>{uiText("Discord")}</strong>
              <span title={discordState?.name}>
                {discordState?.linked
                  ? discordState.name
                    ? `@${discordState.name}`
                    : uiText("Associado")
                  : discordState?.failed
                    ? uiText("Não foi possível conferir a associação.")
                    : discordState?.linked === false
                      ? uiText("Não associado")
                      : uiText("Verificando associação…")}
              </span>
            </div>
          </div>
          {password ? (
            <div className="account-access__password">
              <span>{uiText("Senha")}</span>
              <strong aria-label={uiText("Senha cadastrada")}>********</strong>
              <span>{uiText("Senha cadastrada")}</span>
            </div>
          ) : (
            <EmailAuthForm
              services={services}
              accepted={accepted}
              linkToCurrent
              onBusy={setBusy}
              onAuthenticated={() => {
                setPasswordOwner(user.uid);
                setMessage(uiText("Método associado à sua conta."));
                void services!.authApi
                  .reload(user)
                  .then(() => refresh((n) => n + 1))
                  .catch(() => {});
              }}
            />
          )}
          {password && user.email && (
            <>
              <button
                className="account-access__action"
                type="button"
                disabled={busy || cooling}
                onClick={() =>
                  void run(async () => {
                    const previous = readAccessPreferences(localStorage, user.uid).resetSentAt;
                    if (Date.now() - previous < 60000) {
                      setResetSentAt(previous);
                      setClock(Date.now());
                      setMessage(uiText("Aguarde um minuto antes de reenviar."));
                      return;
                    }
                    await services!.authApi.sendPasswordResetEmail(services!.auth, user.email!);
                    if (services!.auth.currentUser?.uid !== user.uid) return;
                    const now = Date.now();
                    setResetSentAt(now);
                    setClock(now);
                    writeAccessPreferences(localStorage, user.uid, { resetSentAt: now });
                    setNotice(true);
                  })
                }
              >
                {uiText("Redefinir minha senha por e-mail")}
              </button>
              {cooling && (
                <p className="account-access__cooldown">
                  {uiText("Aguarde um minuto antes de reenviar.")}
                </p>
              )}
            </>
          )}
        </>
      )}
      {busy && <HelenaLoading compact label={uiText("Aguarde…")} />}
      {!verificationOnly && onSignOut && (
        <button
          type="button"
          className="account-access__action"
          disabled={busy}
          onClick={() => {
            cue();
            setReauth({ uid: user.uid, action: "sessions" });
          }}
        >
          {uiText("Sair de todos os aparelhos")}
        </button>
      )}
      {reauth?.uid === user.uid && (
        <LibraryDialog
          title={uiText("Confirme que é você")}
          onClose={() => {
            if (!busy) {
              setReauth(undefined);
              setConfirmPassword("");
            }
          }}
        >
          <div className="account-access account-access__unlink">
            <p>
              {reauth.action === "discord"
                ? uiText("Por segurança, confirme seu acesso antes de associar o Discord.")
                : uiText(
                    "Isto encerra todas as sessões desta conta, inclusive neste aparelho. Seus estudos continuam salvos.",
                  )}
            </p>
            {!google && password && (
              <label>
                {uiText("Senha")}
                <input
                  type="password"
                  autoComplete="current-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={busy}
                />
              </label>
            )}
            <div className="account-access__unlink-actions">
              <button
                className="account-access__action"
                disabled={busy}
                onClick={() => {
                  setReauth(undefined);
                  setConfirmPassword("");
                }}
              >
                {uiText("Cancelar")}
              </button>
              <button
                className="account-access__action"
                disabled={busy || (!google && password && !confirmPassword)}
                onClick={() =>
                  void run(async () => {
                    await reconfirm();
                    if (services!.auth.currentUser?.uid !== reauth.uid)
                      throw new Error("owner-changed");
                    const token = await user.getIdToken(true);
                    if (services!.auth.currentUser?.uid !== reauth.uid)
                      throw new Error("owner-changed");
                    if (reauth.action === "discord") {
                      setReauth(undefined);
                      setConfirmPassword("");
                      await startDiscord(token);
                      return;
                    }
                    const response = await fetch(
                      "/api/olena?action=account-auth&step=revoke-sessions",
                      { method: "POST", headers: { Authorization: `Bearer ${token}` } },
                    );
                    if (!response.ok) {
                      setMessage(
                        uiText(
                          "Não foi possível encerrar as sessões agora. Tente novamente em instantes.",
                        ),
                      );
                      return;
                    }
                    setReauth(undefined);
                    setConfirmPassword("");
                    await onSignOut?.();
                  })
                }
              >
                {uiText("Continuar")}
              </button>
            </div>
            {busy && <HelenaLoading compact label={uiText("Aguarde…")} />}
            <p role="status">{message}</p>
          </div>
        </LibraryDialog>
      )}
      {unlink?.uid === user.uid && (
        <LibraryDialog
          title={uiText("Desvincular método de acesso?")}
          onClose={() => {
            if (!busy) {
              setUnlink(undefined);
              setConfirmPassword("");
            }
          }}
        >
          <div className="account-access account-access__unlink">
            <AccountProviderIcon provider={unlink.provider} />
            <p>
              {uiText("Você deixará de entrar nesta conta com {0}.", [
                unlink.provider === "google" ? "Google" : "Discord",
              ])}
            </p>
            <p>
              {uiText(
                "Seus estudos continuam nesta conta. Entre pelo método que permanecer associado. Entrar novamente com o método removido pode criar outra conta.",
              )}
            </p>
            {!google && password && (
              <label>
                {uiText("Senha")}
                <input
                  type="password"
                  autoComplete="current-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={busy}
                />
              </label>
            )}
            <div className="account-access__unlink-actions">
              <button
                className="account-access__action"
                disabled={busy}
                onClick={() => {
                  setUnlink(undefined);
                  setConfirmPassword("");
                }}
              >
                {uiText("Cancelar")}
              </button>
              <button
                className="account-access__action"
                disabled={busy || (!google && password && !confirmPassword)}
                onClick={() =>
                  void run(async () => {
                    if (google)
                      await services!.authApi.reauthenticateWithPopup(
                        user,
                        new services!.authApi.GoogleAuthProvider(),
                      );
                    else if (password && user.email)
                      await services!.authApi.reauthenticateWithCredential(
                        user,
                        services!.authApi.EmailAuthProvider.credential(user.email, confirmPassword),
                      );
                    if (services!.auth.currentUser?.uid !== unlink.uid)
                      throw new Error("owner-changed");
                    const token = await user.getIdToken(true);
                    if (services!.auth.currentUser?.uid !== unlink.uid)
                      throw new Error("owner-changed");
                    const response = await fetch(
                      `/api/olena?action=account-auth&step=unlink-${unlink.provider}`,
                      { method: "POST", headers: { Authorization: `Bearer ${token}` } },
                    );
                    if (!response.ok) {
                      const payload: unknown = await response.json().catch(() => null);
                      if (
                        payload &&
                        typeof payload === "object" &&
                        "error" in payload &&
                        payload.error === "last-method"
                      ) {
                        setMessage(
                          uiText("Adicione outro método de acesso antes de desvincular este."),
                        );
                        return;
                      }
                      throw new Error("unlink-failed");
                    }
                    if (services!.auth.currentUser?.uid !== unlink.uid) return;
                    await services!.authApi.reload(user);
                    setUnlink(undefined);
                    setConfirmPassword("");
                    setStatusRefresh((n) => n + 1);
                    setMessage(uiText("Método desvinculado. Seus estudos foram preservados."));
                    cue(true);
                  })
                }
              >
                {uiText("Desvincular")}
              </button>
            </div>
            {busy && <HelenaLoading compact label={uiText("Aguarde…")} />}
            <p role="status">{message}</p>
          </div>
        </LibraryDialog>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
      {notice &&
        createPortal(
          <aside className="account-access__notice" role="status" aria-live="polite">
            <button type="button" aria-label={uiText("Fechar")} onClick={() => setNotice(false)}>
              <img src="/navigation-icons/paper/close.svg" alt="" width="28" height="28" />
            </button>
            <h3>{uiText("Confira seu e-mail")}</h3>
            <p>
              {uiText(
                "Solicitação de recuperação enviada. Se o e-mail não aparecer, confira Spam ou Lixo eletrônico. Aguarde um minuto antes de reenviar.",
              )}
            </p>
          </aside>,
          document.body,
        )}
    </section>
  );
}
