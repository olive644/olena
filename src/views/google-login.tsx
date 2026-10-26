import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { BrandFooter } from "../components/brand-footer";
import { PaperCardTitle } from "../components/paper-card-title";
import { HelenaLoading } from "../components/helena-loading";
import { PaperArrow } from "../components/paper-arrow";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { writeSyncedStorage } from "../data/synced-storage";
import { GUEST_NAME, endGuestSession, startGuestSession } from "../domain/guest-session";
import { PRIVACY_POLICY_PATH, recordPrivacyConsent } from "../domain/privacy-policy";
import "./google-login.css";
import {
  parseOnboardingAnswers,
  type OnboardingConfiguration,
} from "../domain/onboarding-configuration";
import { readStoredOnboardingConfiguration } from "../data/onboarding-client";
import { rememberReturningVisitor } from "../data/returning-visitor";
import { EmailAuthForm } from "../components/email-auth-form";
import { accountAuthError, setAccountLanguage } from "../data/account-auth";
import type { AccountServices } from "../data/account-auth";
import type { UserCredential } from "firebase/auth";

const PENDING_ANSWERS_KEY = "helena.pending-google-answers";
let discordExchange:
  { code: string; expiresAt: number; promise: Promise<UserCredential> } | undefined;
function exchangeDiscord(code: string, services: AccountServices): Promise<UserCredential> {
  if (discordExchange?.code === code && discordExchange.expiresAt > Date.now())
    return discordExchange.promise;
  const promise = (async () => {
    const response = await fetch(
      `/api/olena?action=account-auth&step=exchange&code=${encodeURIComponent(code)}`,
      { method: "POST", credentials: "same-origin" },
    );
    if (!response.ok) throw new Error("discord-exchange");
    const payload: unknown = await response.json();
    if (
      !payload ||
      typeof payload !== "object" ||
      !("token" in payload) ||
      typeof payload.token !== "string"
    )
      throw new Error("discord-exchange");
    return services.authApi.signInWithCustomToken(services.auth, payload.token);
  })();
  discordExchange = { code, expiresAt: Date.now() + 60000, promise };
  return promise;
}
function pendingConfiguration() {
  try {
    return (
      readStoredOnboardingConfiguration(sessionStorage.getItem(PENDING_ANSWERS_KEY)) ?? undefined
    );
  } catch {
    return undefined;
  }
}

export function hasPendingGoogleRedirect(): boolean {
  try {
    return window.sessionStorage.getItem(PENDING_ANSWERS_KEY) !== null;
  } catch {
    return false;
  }
}

function isPopupBlockedError(cause: unknown): boolean {
  const code = cause && typeof cause === "object" && "code" in cause ? cause.code : "";
  return code === "auth/popup-blocked" || code === "auth/cancelled-popup-request";
}

function googleLoginError(cause: unknown): string {
  const code = cause && typeof cause === "object" && "code" in cause ? cause.code : "";
  if (code === "auth/popup-closed-by-user") return uiText(1192);
  if (code === "auth/popup-blocked") return uiText(1964);
  if (code === "auth/network-request-failed") return uiText(1193);
  if (code === "auth/unauthorized-domain") return uiText(1194);
  return uiText(1195);
}

function applyGoogleLogin(
  answers: readonly (string | string[])[],
  configuration?: OnboardingConfiguration,
  configurationOwner?: string,
) {
  rememberReturningVisitor();
  // Login direto não cria conclusão fictícia nem substitui respostas da conta.
  if (answers.length === 0 && configurationOwner !== "guest") return;
  writeSyncedStorage(
    "helena.onboarding.v1",
    JSON.stringify({
      answers,
      completed: true,
      ...(configuration ? { configuration, configurationOwner, configurationPending: true } : {}),
    }),
  );
}

/** Entrada como convidado: nada vai a servidor algum, as respostas ficam só neste aparelho. */
export function enterAsGuest(
  answers: readonly (string | string[])[],
  configuration?: OnboardingConfiguration,
) {
  startGuestSession();
  applyGoogleLogin(answers, configuration, "guest");
}

export function readPendingGoogleAnswers(): readonly (string | string[])[] {
  try {
    const raw = window.sessionStorage.getItem(PENDING_ANSWERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) return parsed as (string | string[])[];
    return parsed && typeof parsed === "object" && "answers" in parsed
      ? (parseOnboardingAnswers(parsed.answers) ?? [])
      : [];
  } catch {
    return [];
  }
}

function clearPendingAnswers() {
  try {
    window.sessionStorage.removeItem(PENDING_ANSWERS_KEY);
  } catch {
    /* Nothing to clean up when storage is unavailable. */
  }
}

export function GoogleLogin({
  answers,
  configuration,
  onFinish,
  onBack,
  returning = false,
  onCreateAccount,
}: {
  answers: readonly (string | string[])[];
  configuration?: OnboardingConfiguration | undefined;
  onFinish: () => void;
  onBack?: () => void;
  returning?: boolean;
  onCreateAccount?: () => void;
}) {
  useLanguage();

  const [services, setServices] =
    useState<Awaited<ReturnType<typeof getFirebaseAccountServices>>>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  // Nunca vem marcada: o aceite da política precisa ser um ato da pessoa.
  const [accepted, setAccepted] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const pending = useRef(false);
  const discordCode = useRef(new URL(window.location.href).searchParams.get("discord"));
  const discordIntent = useRef({
    answers: readPendingGoogleAnswers(),
    configuration: pendingConfiguration(),
  });

  useEffect(() => {
    let active = true;
    void getFirebaseAccountServices()
      .then(async (loaded) => {
        if (!active) return;
        const url = new URL(window.location.href);
        const discord = discordCode.current;
        if (discord) {
          const credential = await exchangeDiscord(discord, loaded);
          if (!active) return;
          endGuestSession();
          applyGoogleLogin(
            discordIntent.current.answers,
            discordIntent.current.configuration,
            credential.user.uid,
          );
          clearPendingAnswers();
          window.history.replaceState(null, "", url.pathname);
          if (discordExchange?.code === discord) discordExchange = undefined;
          if (active) onFinish();
          return;
        }
        if (url.searchParams.has("authError")) {
          window.history.replaceState(null, "", url.pathname);
          clearPendingAnswers();
          if (active)
            setError(uiText("A autorização do Discord não foi concluída. Tente novamente."));
        }
        // Retorno de um login que precisou de redirecionamento de página
        // inteira (pop-up bloqueado): completa o fluxo com as respostas que
        // ficaram guardadas antes de sair da página. O resultado já vem
        // resolvido de getFirebaseAccountServices (antes de mexer na
        // persistência) porque o Firebase só entrega esse resultado uma vez.
        if (hasPendingGoogleRedirect()) {
          if (loaded.redirectResult) {
            endGuestSession();
            applyGoogleLogin(
              readPendingGoogleAnswers(),
              readStoredOnboardingConfiguration(
                window.sessionStorage.getItem(PENDING_ANSWERS_KEY),
              ) ?? undefined,
              loaded.redirectResult.user.uid,
            );
            clearPendingAnswers();
            if (active) onFinish();
            return;
          }
          clearPendingAnswers();
        }
        if (active) {
          setServices(loaded);
          setBusy(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(uiText(1196));
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startDiscord() {
    if (!services || pending.current || !accepted) return;
    pending.current = true;
    setSigningIn(true);
    setError("");
    try {
      recordPrivacyConsent(window.localStorage);
      sessionStorage.setItem(
        PENDING_ANSWERS_KEY,
        JSON.stringify(configuration ? { answers, configuration } : answers),
      );
      const response = await fetch("/api/olena?action=account-auth&step=start", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("discord-start");
      const payload = (await response.json()) as { url?: unknown };
      const url = typeof payload.url === "string" ? new URL(payload.url) : undefined;
      if (!url || url.origin !== "https://discord.com" || url.pathname !== "/oauth2/authorize")
        throw new Error("discord-start");
      window.location.assign(url.toString());
    } catch {
      clearPendingAnswers();
      pending.current = false;
      setSigningIn(false);
      setError(
        uiText(
          "O acesso com Discord está indisponível. Tente outro método ou tente novamente mais tarde.",
        ),
      );
    }
  }

  async function login(method: "google" | "apple" = "google") {
    if (!services || pending.current || !accepted) return;
    pending.current = true;
    setSigningIn(true);
    // O aceite é registrado antes de sair para o Google: o login pode virar um
    // redirecionamento de página inteira e a pessoa voltaria sem o registro.
    recordPrivacyConsent(window.localStorage);
    setBusy(true);
    setError("");
    setAccountLanguage(services);
    const provider =
      method === "apple"
        ? new services.authApi.OAuthProvider("apple.com")
        : new services.authApi.GoogleAuthProvider();
    if (method === "google") provider.setCustomParameters({ prompt: "select_account" });
    else {
      provider.addScope("email");
      provider.addScope("name");
    }
    try {
      const credential = await services.authApi.signInWithPopup(services.auth, provider);
      endGuestSession();
      applyGoogleLogin(answers, configuration, credential?.user?.uid);
      onFinish();
    } catch (cause) {
      if (isPopupBlockedError(cause)) {
        // Alguns navegadores (extensões, bloqueadores de pop-up) impedem a
        // janela do Google mesmo em um clique legítimo. O redirecionamento
        // de página inteira não depende de pop-up e funciona nesses casos.
        try {
          window.sessionStorage.setItem(
            PENDING_ANSWERS_KEY,
            JSON.stringify(configuration ? { answers, configuration } : answers),
          );
        } catch {
          /* Sem sessionStorage, o redirecionamento ainda funciona, só perde as respostas do onboarding. */
        }
        try {
          await services.authApi.signInWithRedirect(services.auth, provider);
          return;
        } catch (redirectCause) {
          // Sem isto, uma falha aqui (domínio não autorizado, rede) ficava sem tratamento: a
          // pessoa via o botão parado em "Aguardando o Google…" para sempre, sem nenhum aviso.
          clearPendingAnswers();
          setError(
            method === "google" ? googleLoginError(redirectCause) : accountAuthError(redirectCause),
          );
          pending.current = false;
          setSigningIn(false);
          setBusy(false);
          return;
        }
      }
      setError(method === "google" ? googleLoginError(cause) : accountAuthError(cause));
      pending.current = false;
      setSigningIn(false);
      setBusy(false);
    }
  }

  // Nada é enviado a servidor nenhum: os estudos ficam só neste aparelho, então
  // não há aceite de política a registrar como no login com Google.
  function continueAsGuest() {
    if (pending.current) return;
    enterAsGuest(answers, configuration);
    onFinish();
  }

  return (
    <main className="onboarding login-page" id="main-content" aria-label={uiText(1197)}>
      <h1 className="sr-only">{uiText(1198)}</h1>
      <header className="onboarding__header">
        <span className="onboarding__brand">
          <PaperCardTitle value="OlenaStudy" />
        </span>
      </header>
      <div className="login-page__layout">
        <section className="login-page__card">
          <img
            className={
              returning
                ? "login-page__perched login-page__perched--returning"
                : "login-page__perched"
            }
            src={returning ? "/helena-welcome-back.webp" : "/helena-login-peeking.png"}
            alt={uiText(1204)}
            width="640"
            height="640"
            fetchPriority="high"
          />
          <span className="login-page__eyebrow">{uiText(1205)}</span>
          <h2>{returning ? uiText("Boas-vindas de volta!") : uiText(1206)}</h2>
          <p className="login-page__intro">
            {returning ? uiText("Seu espaço de estudos espera por você.") : uiText(1207)}
            <br />
            {returning ? uiText("Use o mesmo método de acesso da sua conta.") : uiText(1208)}
          </p>
          {(busy || (!services && !error)) && <HelenaLoading compact label={uiText(1209)} />}
          {error && <p role="alert">{uiText(error)}</p>}
          <label className="login-page__consent">
            <input
              type="checkbox"
              checked={accepted}
              aria-describedby="login-consent-help"
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>
              {uiText(1210)}{" "}
              <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noopener noreferrer">
                {uiText(411)}
                <span className="sr-only"> {uiText(412)}</span>
              </a>
              {uiText(2567)}
            </span>
          </label>
          <p id="login-consent-help" className="login-page__consent-help">
            {accepted ? "" : uiText(1211)}
          </p>
          <div className="login-page__social">
            <div className="onboarding__actions login-page__actions">
              <button
                data-provider="google"
                aria-label={uiText(870)}
                type="button"
                disabled={!services || busy || signingIn || !accepted}
                aria-describedby="login-consent-help"
                onClick={() => void login()}
              >
                {uiText(870)}
                <PaperArrow />
              </button>
            </div>
            <div className="login-page__providers">
              <button
                data-provider="apple"
                aria-label={uiText("Entrar com Apple")}
                type="button"
                disabled={!services || busy || signingIn || !accepted}
                onClick={() => void login("apple")}
              >
                {uiText("Entrar com Apple")}
              </button>
              <button
                data-provider="discord"
                aria-label={uiText("Entrar com Discord")}
                type="button"
                disabled={!services || busy || signingIn || !accepted}
                onClick={() => void startDiscord()}
              >
                <img
                  src="/navigation-icons/paper/profile-discord.svg"
                  alt=""
                  width="24"
                  height="24"
                />
                {uiText("Entrar com Discord")}
              </button>
            </div>
          </div>
          <EmailAuthForm
            services={busy || signingIn ? undefined : services}
            accepted={accepted}
            initialRegister={!returning && answers.length > 0}
            onBusy={setSigningIn}
            onAuthenticated={() => {
              const user = services?.auth.currentUser;
              if (!user) {
                setError(accountAuthError(null));
                return;
              }
              recordPrivacyConsent(window.localStorage);
              endGuestSession();
              applyGoogleLogin(answers, configuration, user.uid);
              onFinish();
            }}
          />
          <p className="login-page__local">{uiText(1212)}</p>
          <div className="login-page__guest">
            <button type="button" disabled={signingIn} onClick={continueAsGuest}>
              {uiText(1213)}
            </button>
            <p>
              {uiText(1214)} {GUEST_NAME} {uiText(1215)}
            </p>
          </div>
          <div className="login-page__divider" />
          {returning && onCreateAccount && (
            <button
              className="login-page__back"
              type="button"
              disabled={signingIn}
              onClick={onCreateAccount}
            >
              {uiText("Primeira vez por aqui? Crie sua conta")}
              <PaperArrow />
            </button>
          )}
          {onBack && (
            <button className="login-page__back" type="button" disabled={busy} onClick={onBack}>
              <PaperArrow back />
              {uiText(374)}
            </button>
          )}
        </section>
      </div>
      <footer className="login-page__footer">{uiText(1216)}</footer>
      <BrandFooter withOlena />
    </main>
  );
}
