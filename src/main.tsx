import { StrictMode, lazy, Suspense } from "react";
import { HelenaLoading } from "./components/helena-loading";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./styles.css";
import "./local-room-flat.css";
import "./paper-buttons.css";
import "./notebook-editor.css";

const NotebookReader = lazy(() => import("./views/notebook-reader"));
const viewToken = new URLSearchParams(location.search).get("notebook-view");

const root = document.getElementById("root");

if (!root) {
  throw new Error("Elemento #root não encontrado.");
}

createRoot(root).render(
  <StrictMode>
    {viewToken ? (
      <Suspense fallback={<HelenaLoading label="Abrindo folhas" />}>
        <NotebookReader token={viewToken} />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
