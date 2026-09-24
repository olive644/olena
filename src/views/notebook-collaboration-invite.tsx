import { useState } from "react";
import { NoteCaptureTools } from "../components/note-capture-tools";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { useCloudSync } from "../hooks/use-cloud-sync";

export default function NotebookCollaborationInvite({ code }: { code: string }) {
  const cloud = useCloudSync();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const { auth, authApi } = await getFirebaseAccountServices();
      const provider = new authApi.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await authApi.signInWithPopup(auth, provider);
    } catch (cause) {
      const code = cause && typeof cause === "object" && "code" in cause ? cause.code : "";
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        try {
          const { auth, authApi } = await getFirebaseAccountServices();
          await authApi.signInWithRedirect(auth, new authApi.GoogleAuthProvider());
          return;
        } catch {
          // Mostra o mesmo estado de erro para uma falha de rede ou redirecionamento.
        }
      }
      setError("Não foi possível entrar. Verifique a conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="notebook-invite-entry">
      <h1>Caderno compartilhado</h1>
      {!cloud.ready ? (
        <p>Preparando sua conta e o caderno…</p>
      ) : !cloud.authenticated ? (
        <section className="notebook-invite-signin">
          <p>Entre com sua conta para editar junto. Seu nome e avatar aparecem para a equipe.</p>
          <button
            className="primary-button"
            type="button"
            disabled={busy || !cloud.enabled}
            onClick={() => void signIn()}
          >
            {busy ? "Entrando…" : "Entrar com Google"}
          </button>
          {error && <p role="alert">{error}</p>}
        </section>
      ) : (
        <NoteCaptureTools
          cloud={cloud}
          draftPageKey={`shared-${code}`}
          initialJoinCode={code}
          onSave={() => undefined}
        />
      )}
    </main>
  );
}
