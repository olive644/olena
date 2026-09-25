import { StrictMode, lazy, Suspense } from "react";
import { HelenaLoading } from "./components/helena-loading";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./styles.css";
import "./local-room-flat.css";
import "./paper-buttons.css";
import "./notebook-editor.css";
import "./notebook-workspace.css";
import "./notebook-mobile.css";

const NotebookReader = lazy(() => import("./views/notebook-reader"));
const NotebookCollaborationInvite = lazy(() => import("./views/notebook-collaboration-invite"));
const params = new URLSearchParams(location.search);
const viewToken = params.get("notebook-view");
const collaborationCode = params.get("notebook-collab");

const root = document.getElementById("root");

if (!root) {
  throw new Error("Elemento #root não encontrado.");
}

createRoot(root).render(
  <StrictMode>
    {viewToken || collaborationCode ? (
      <Suspense fallback={<HelenaLoading label="Abrindo caderno" />}>
        {viewToken ? (
          <NotebookReader token={viewToken} />
        ) : (
          <NotebookCollaborationInvite code={collaborationCode!} />
        )}
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
