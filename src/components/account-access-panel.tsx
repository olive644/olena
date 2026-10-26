import { useEffect, useState } from "react";
import { uiText } from "../i18n/runtime";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { accountAuthError, type AccountServices } from "../data/account-auth";
import { EmailAuthForm } from "./email-auth-form";
import "./account-access.css";
import "../views/google-login.css";
import "../views/auth-paper.css";

export function AccountAccessPanel({ verificationOnly = false }: { verificationOnly?: boolean }) {
  const [services, setServices] = useState<AccountServices>();
  const [message, setMessage] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    let active = true;
    void getFirebaseAccountServices()
      .then((value) => {
        if (active) setServices(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const user = services?.auth.currentUser;
  const needsVerification = !!user?.email && !user.emailVerified && !verified;
  const password = user?.providerData.some((entry) => entry.providerId === "password");
  if (!user || (verificationOnly && !needsVerification)) return null;
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (cause) {
      setMessage(accountAuthError(cause));
    } finally {
      setBusy(false);
    }
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
        <>
          <p>{uiText("Confirme seu e-mail para comprovar que ele pertence a você.")}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (Date.now() - sentAt < 60000) {
                  setMessage(uiText("Aguarde um minuto antes de reenviar."));
                  return;
                }
                await services!.authApi.sendEmailVerification(user!);
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
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await services!.authApi.reload(user!);
                await user!.getIdToken(true);
                setVerified(user!.emailVerified);
                setMessage(
                  user!.emailVerified
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
        </>
      )}
      {!verificationOnly && (
        <>
          <p>
            {uiText("Adicione um método à conta atual para manter os mesmos estudos e conquistas.")}
          </p>
          <label>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            {uiText(
              "Autorizo associar este método à minha conta, inclusive se eu usar um e-mail privado da Apple.",
            )}
          </label>
          <div className="login-page__providers">
            {(["google.com", "apple.com"] as const)
              .filter(
                (provider) => !user.providerData.some((entry) => entry.providerId === provider),
              )
              .map((provider) => (
                <button
                  key={provider}
                  type="button"
                  disabled={busy || !accepted}
                  onClick={() =>
                    void run(async () => {
                      await services!.authApi.linkWithPopup(
                        user!,
                        provider === "google.com"
                          ? new services!.authApi.GoogleAuthProvider()
                          : new services!.authApi.OAuthProvider("apple.com"),
                      );
                      setMessage(uiText("Método associado à sua conta."));
                    })
                  }
                >
                  {provider === "google.com" ? uiText("Associar Google") : uiText("Associar Apple")}
                </button>
              ))}
            <button
              type="button"
              disabled={busy || !accepted}
              onClick={() =>
                void run(async () => {
                  const response = await fetch("/api/olena?action=account-auth&step=start", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { Authorization: `Bearer ${await user!.getIdToken()}` },
                  });
                  if (!response.ok) throw new Error("discord-link");
                  const payload = (await response.json()) as { url: string };
                  const target = new URL(payload.url);
                  if (
                    target.origin !== "https://discord.com" ||
                    target.pathname !== "/oauth2/authorize"
                  )
                    throw new Error("discord-link");
                  window.location.assign(target.toString());
                })
              }
            >
              {uiText("Associar Discord")}
            </button>
          </div>
          {!password && (
            <EmailAuthForm
              services={services}
              accepted={accepted}
              linkToCurrent
              onBusy={setBusy}
              onAuthenticated={() => setMessage(uiText("Método associado à sua conta."))}
            />
          )}
          {user.email && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await services!.authApi.sendPasswordResetEmail(services!.auth, user!.email!);
                  setMessage(
                    uiText(
                      "Se houver uma conta para este e-mail, você receberá instruções para redefinir a senha.",
                    ),
                  );
                })
              }
            >
              {uiText("Redefinir minha senha por e-mail")}
            </button>
          )}
          {!user.providerData.length && (
            <p>
              {uiText(
                "Para excluir uma conta do Discord, entre novamente antes de confirmar a exclusão.",
              )}
            </p>
          )}
        </>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
