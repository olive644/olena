import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { BrandFooter } from "../components/brand-footer";
import { HelenaLoading } from "../components/helena-loading";
import { PaperArrow } from "../components/paper-arrow";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { writeSyncedStorage } from "../data/synced-storage";
import { GUEST_NAME, endGuestSession, startGuestSession } from "../domain/guest-session";
import { PRIVACY_POLICY_PATH, recordPrivacyConsent } from "../domain/privacy-policy";
import "./google-login.css";

const PENDING_ANSWERS_KEY = "helena.pending-google-answers";

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

function applyGoogleLogin(answers: readonly (string | string[])[]) {
  writeSyncedStorage("helena.onboarding.v1", JSON.stringify({ answers, completed: true }));
}

/** Entrada como convidado: nada vai a servidor algum, as respostas ficam só neste aparelho. */
export function enterAsGuest(answers: readonly (string | string[])[]) {
  startGuestSession();
  applyGoogleLogin(answers);
}

export function readPendingGoogleAnswers(): readonly (string | string[])[] {
  try {
    const raw = window.sessionStorage.getItem(PENDING_ANSWERS_KEY);
    return raw ? (JSON.parse(raw) as (string | string[])[]) : [];
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
  onFinish,
  onBack,
}: {
  answers: readonly (string | string[])[];
  onFinish: () => void;
  onBack?: () => void;
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

  useEffect(() => {
    let active = true;
    void getFirebaseAccountServices()
      .then((loaded) => {
        // Retorno de um login que precisou de redirecionamento de página
        // inteira (pop-up bloqueado): completa o fluxo com as respostas que
        // ficaram guardadas antes de sair da página. O resultado já vem
        // resolvido de getFirebaseAccountServices (antes de mexer na
        // persistência) porque o Firebase só entrega esse resultado uma vez.
        if (hasPendingGoogleRedirect()) {
          if (loaded.redirectResult) {
            endGuestSession();
            applyGoogleLogin(readPendingGoogleAnswers());
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

  async function login() {
    if (!services || pending.current || !accepted) return;
    pending.current = true;
    setSigningIn(true);
    // O aceite é registrado antes de sair para o Google: o login pode virar um
    // redirecionamento de página inteira e a pessoa voltaria sem o registro.
    recordPrivacyConsent(window.localStorage);
    setBusy(true);
    setError("");
    const provider = new services.authApi.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await services.authApi.signInWithPopup(services.auth, provider);
      endGuestSession();
      applyGoogleLogin(answers);
      onFinish();
    } catch (cause) {
      if (isPopupBlockedError(cause)) {
        // Alguns navegadores (extensões, bloqueadores de pop-up) impedem a
        // janela do Google mesmo em um clique legítimo. O redirecionamento
        // de página inteira não depende de pop-up e funciona nesses casos.
        try {
          window.sessionStorage.setItem(PENDING_ANSWERS_KEY, JSON.stringify(answers));
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
          setError(googleLoginError(redirectCause));
          pending.current = false;
          setSigningIn(false);
          setBusy(false);
          return;
        }
      }
      setError(googleLoginError(cause));
      pending.current = false;
      setSigningIn(false);
      setBusy(false);
    }
  }

  // Nada é enviado a servidor nenhum: os estudos ficam só neste aparelho, então
  // não há aceite de política a registrar como no login com Google.
  function continueAsGuest() {
    if (pending.current) return;
    enterAsGuest(answers);
    onFinish();
  }

  return (
    <main className="onboarding login-page" id="main-content" aria-label={uiText(1197)}>
      <h1 className="sr-only">{uiText(1198)}</h1>
      <header className="onboarding__header">
        <span className="onboarding__brand">
          {uiText(117)}
          <span>{uiText(118)}</span>
        </span>
        <span className="onboarding__eyebrow">{uiText(1199)}</span>
      </header>
      <div className="login-page__layout">
        <section className="login-page__scene" aria-label={uiText(1200)}>
          <span className="login-page__note">{uiText(1201)}</span>
          <span className="login-page__star login-page__star--one" aria-hidden="true">
            ✦
          </span>
          <span className="login-page__star login-page__star--two" aria-hidden="true">
            ✦
          </span>
          <p>
            {uiText(1202)}
            <br />
            <strong>{uiText(1203)}</strong>
          </p>
        </section>
        <section className="login-page__card">
          <img
            className="login-page__perched"
            src="/helena-login-peeking.png"
            alt={uiText(1204)}
            width="640"
            height="640"
            fetchPriority="high"
          />
          <span className="login-page__eyebrow">{uiText(1205)}</span>
          <h2>{uiText(1206)}</h2>
          <p className="login-page__intro">
            {uiText(1207)}
            <br />
            {uiText(1208)}
          </p>
          {(busy || (!services && !error)) && (
            <HelenaLoading compact label={busy ? uiText(1965) : uiText(1209)} />
          )}
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
          <div className="onboarding__actions login-page__actions">
            <button
              type="button"
              disabled={!services || busy || !accepted}
              aria-describedby="login-consent-help"
              onClick={() => void login()}
            >
              {uiText(870)}
              <PaperArrow />
            </button>
          </div>
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
          {onBack && (
            <button className="login-page__back" type="button" disabled={busy} onClick={onBack}>
              <PaperArrow back />
              {uiText(374)}
            </button>
          )}
        </section>
      </div>
      <footer className="login-page__footer">{uiText(1216)}</footer>
      <BrandFooter />
    </main>
  );
}
