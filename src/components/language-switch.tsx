import { useState } from "react";
import { changeLanguage, useLanguage } from "../i18n/runtime";
import { OnboardingPaperIcon } from "./onboarding-paper-icon";

export function LanguageSwitch() {
  const language = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const label = language === "pt-BR" ? "Mudar idioma para inglês" : "Switch language to Portuguese";
  return (
    <div className="language-switch">
      <button
        type="button"
        className="appearance-picker__trigger"
        disabled={busy}
        aria-label={label}
        title={label}
        aria-busy={busy}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            await changeLanguage(language === "pt-BR" ? "en-US" : "pt-BR");
          } catch {
            setError(
              "Não foi possível carregar o idioma. Tente novamente. / Could not load the language. Try again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <OnboardingPaperIcon name={language === "pt-BR" ? "flag-br" : "flag-us"} />
      </button>
      {error && (
        <p role="alert" className="language-switch__error">
          {error}
        </p>
      )}
    </div>
  );
}
