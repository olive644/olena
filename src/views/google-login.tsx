import { useEffect, useRef, useState } from "react";
import { HelenaLoading } from "../components/helena-loading";
import { PaperArrow } from "../components/paper-arrow";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { writeSyncedStorage } from "../data/synced-storage";
import "./google-login.css";

async function prepareGoogle() {
  const { auth, authApi } = await getFirebaseAccountServices();
  const provider = new authApi.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return () => authApi.signInWithPopup(auth, provider);
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

export function GoogleLogin({
  answers,
  onFinish,
  onBack,
}: {
  answers: readonly (string | string[])[];
  onFinish: () => void;
  onBack?: () => void;
}) {
  const [start, setStart] = useState<Awaited<ReturnType<typeof prepareGoogle>>>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    void prepareGoogle()
      .then((login) => {
        if (active) setStart(() => login);
      })
      .catch(() => {
        if (active) setError("O login está sendo preparado. Tente novamente mais tarde.");
      });
    return () => {
      active = false;
    };
  }, []);
  async function login() {
    if (!start || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const credential = await start();
      try {
        writeSyncedStorage("helena.onboarding.v1", JSON.stringify({ answers, completed: true }));
        writeSyncedStorage(
          "helena.profile.v1",
          JSON.stringify({
            name: credential.user.displayName ?? undefined,
            photoUrl: "/profile-avatars/helena.webp",
          }),
        );
      } catch {
        /* Login remains valid when browser storage is unavailable. */
      }
      onFinish();
    } catch (cause) {
      setError(googleLoginError(cause));
    } finally {
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
          {(busy || (!start && !error)) && (
            <HelenaLoading
              compact
              label={busy ? "Aguardando o Google…" : "Preparando seu login…"}
            />
          )}
          {error && <p role="alert">{error}</p>}
          <div className="onboarding__actions login-page__actions">
            <button type="button" disabled={!start || busy} onClick={() => void login()}>
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
