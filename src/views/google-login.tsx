import { useEffect, useRef, useState } from "react";
import { HelenaLoading } from "../components/helena-loading";
import { PaperArrow } from "../components/paper-arrow";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { writeSyncedStorage } from "../data/synced-storage";
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
  if (code === "auth/popup-closed-by-user")
    return "A janela foi fechada. Você pode tentar novamente.";
  if (code === "auth/popup-blocked")
    return "Permita a janela de login no navegador e tente novamente.";
  if (code === "auth/network-request-failed") return "Confira sua conexão e tente novamente.";
  return "Não foi possível entrar agora. Tente novamente em instantes.";
}

function applyGoogleLogin(displayName: string | null, answers: readonly (string | string[])[]) {
  writeSyncedStorage("helena.onboarding.v1", JSON.stringify({ answers, completed: true }));
  writeSyncedStorage(
    "helena.profile.v1",
    JSON.stringify({ name: displayName ?? undefined, photoUrl: "/profile-avatars/helena.webp" }),
  );
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
  const [services, setServices] =
    useState<Awaited<ReturnType<typeof getFirebaseAccountServices>>>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
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
            applyGoogleLogin(loaded.redirectResult.user.displayName, readPendingGoogleAnswers());
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
          setError("O login está sendo preparado. Tente novamente mais tarde.");
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login() {
    if (!services || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const provider = new services.authApi.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const credential = await services.authApi.signInWithPopup(services.auth, provider);
      applyGoogleLogin(credential.user.displayName, answers);
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
        await services.authApi.signInWithRedirect(services.auth, provider);
        return;
      }
      setError(googleLoginError(cause));
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="onboarding login-page" id="main-content" aria-label="Entrar na OliStudy">
      <h1 className="sr-only">
        OliStudy: agenda de estudos, pomodoro, flashcards e quizzes para ENEM, vestibular e
        concursos
      </h1>
      <header className="onboarding__header">
        <span className="onboarding__brand">
          Oli<span>Study</span>
        </span>
        <span className="onboarding__eyebrow">SEU PRÓXIMO PASSO COMEÇA AQUI</span>
      </header>
      <div className="login-page__layout">
        <section className="login-page__scene" aria-label="Sua companheira de estudos">
          <span className="login-page__note">Vamos nessa, juntos?</span>
          <span className="login-page__star login-page__star--one" aria-hidden="true">
            ✦
          </span>
          <span className="login-page__star login-page__star--two" aria-hidden="true">
            ✦
          </span>
          <p>
            Um pouco de curiosidade.
            <br />
            <strong>Um mundo de descobertas.</strong>
          </p>
        </section>
        <section className="login-page__card">
          <img
            className="login-page__perched"
            src="/helena-login-peeking.png"
            alt="Helena espiando sobre o cartão de login, com as patinhas na borda"
            width="640"
            height="640"
            fetchPriority="high"
          />
          <span className="login-page__eyebrow">BEM-VINDO AO SEU ESPAÇO</span>
          <h2>Vamos começar?</h2>
          <p className="login-page__intro">
            A Helena já está por aqui.
            <br />
            Só falta você para essa jornada.
          </p>
          {(busy || (!services && !error)) && (
            <HelenaLoading
              compact
              label={busy ? "Aguardando o Google…" : "Preparando seu login…"}
            />
          )}
          {error && <p role="alert">{error}</p>}
          <div className="onboarding__actions login-page__actions">
            <button type="button" disabled={!services || busy} onClick={() => void login()}>
              Entrar com Google
              <PaperArrow />
            </button>
          </div>
          <p className="login-page__local">Seus estudos ficam sincronizados na sua conta.</p>
          <div className="login-page__divider" />
          {onBack && (
            <button className="login-page__back" type="button" disabled={busy} onClick={onBack}>
              <PaperArrow back />
              Voltar
            </button>
          )}
        </section>
      </div>
      <footer className="login-page__footer">No seu tempo. Do seu jeito. Com a Helena.</footer>
    </main>
  );
}
