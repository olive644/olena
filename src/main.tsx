import { uiText, initializeLanguage } from "./i18n/runtime";
import { StrictMode, lazy, Suspense } from "react";
import { HelenaLoading } from "./components/helena-loading";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./local-room-flat.css";
import "./paper-buttons.css";
import "./notebook-editor.css";
import "./notebook-workspace.css";
import "./notebook-mobile.css";
import "./navigation-refinements.css";
import "./paper-controls.css";
import "./paper-cursor.css";
import "./accessibility.css";
import "./room-social.css";
import { initializeAccessibility } from "./data/accessibility-preferences";
import { initializeAppHaptics } from "./data/settings-haptics";

initializeAccessibility();
initializeAppHaptics();

const NotebookReader = lazy(() => import("./views/notebook-reader"));
const NotebookCollaborationInvite = lazy(() => import("./views/notebook-collaboration-invite"));
const params = new URLSearchParams(location.search);
const viewToken = params.get("notebook-view");
const collaborationCode = params.get("notebook-collab");

const root = document.getElementById("root");

if (!root) {
  throw new Error(uiText(1146));
}

const appRoot = createRoot(root);
appRoot.render(<HelenaLoading label="Preparando / Preparing…" />);
async function boot() {
  try {
    await initializeLanguage();
    const { App } = await import("./app");
    appRoot.render(
      <StrictMode>
        {viewToken || collaborationCode ? (
          <Suspense fallback={<HelenaLoading label={uiText(1147)} />}>
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
  } catch {
    appRoot.render(
      <main>
        <p>Não foi possível carregar o idioma. / Could not load the language.</p>
        <button type="button" onClick={() => void boot()}>
          Tentar novamente / Retry
        </button>
      </main>,
    );
  }
}
void boot();
