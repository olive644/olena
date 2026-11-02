import { useEffect, useReducer, useState } from "react";
import { createRoot } from "react-dom/client";
import { VoicesPortJourney } from "../src/components/voices-port-journey";
import { createInitialWorkspace, workspaceReducer } from "../src/domain/workspace";
import { initializeLanguage } from "../src/i18n/runtime";
import "../src/styles.css";
import "../src/practice-islands.css";
import "../src/paper-buttons.css";
import "../src/paper-controls.css";
import "../src/accessibility.css";

export function VoicesPreview() {
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, createInitialWorkspace);
  const [dark, setDark] = useState(false);
  const [key, setKey] = useState(0);
  useEffect(() => {
    document.documentElement.dataset["theme"] = dark ? "dark" : "light";
  }, [dark]);
  return (
    <div className="app-shell voices-preview-frame">
      <header className="voices-preview-controls">
        <p>
          <strong>OLENASTUDY · PORTO DAS VOZES</strong>
          <br />
          Prévia do componente real. Atividades desta sessão, sem conta ou sincronização.
        </p>
        <button
          type="button"
          className="secondary-button"
          aria-pressed={dark}
          onClick={() => setDark(!dark)}
        >
          {dark ? "Ver modo claro" : "Ver modo escuro"}
        </button>
      </header>
      <VoicesPortJourney
        key={key}
        workspace={workspace}
        onPractice={(activity) => dispatch({ type: "practice/recorded", activity })}
        onBack={() => setKey((value) => value + 1)}
      />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
void initializeLanguage().then(() => root.render(<VoicesPreview />));
