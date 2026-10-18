import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useState } from "react";
import { NotesView } from "./notes-view";
import { useWorkspace } from "../hooks/use-workspace";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { useCloudSync } from "../hooks/use-cloud-sync";

export default function NotebookCollaborationInvite({ code }: { code: string }) {
  useLanguage();

  const cloud = useCloudSync();
  const { workspace, dispatch } = useWorkspace();
  const notebookId = `shared-${code}`;
  const exists = workspace.notebooks.some((book) => book.id === notebookId);
  useEffect(() => {
    if (cloud.authenticated && !exists)
      dispatch({
        type: "notebook/added",
        id: notebookId,
        title: uiText(1332),
        subjectId: "",
        createdAt: new Date().toISOString(),
      });
  }, [cloud.authenticated, exists, notebookId, dispatch]);
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
      setError(uiText(1331));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="notebook-invite-entry">
      <h1>{uiText(1332)}</h1>
      {!cloud.ready ? (
        <p>{uiText(1333)}</p>
      ) : !cloud.authenticated ? (
        <section className="notebook-invite-signin">
          <p>{uiText(1334)}</p>
          <button
            className="primary-button"
            type="button"
            disabled={busy || !cloud.enabled}
            onClick={() => void signIn()}
          >
            {busy ? uiText(1747) : uiText(870)}
          </button>
          {error && <p role="alert">{uiText(error)}</p>}
        </section>
      ) : exists ? (
        <NotesView
          cloud={cloud}
          workspace={workspace}
          dispatch={dispatch}
          initialNotebookId={notebookId}
          initialJoinCode={code}
        />
      ) : (
        <p>{uiText(1335)}</p>
      )}
    </div>
  );
}
