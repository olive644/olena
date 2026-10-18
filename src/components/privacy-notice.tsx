import { uiText, useLanguage } from "../i18n/runtime";
import { useState } from "react";
import { PRIVACY_POLICY_PATH, PRIVACY_POLICY_VERSION } from "../domain/privacy-policy";
import "./privacy-notice.css";

// É uma confirmação de leitura, não autoriza IA, voz ou serviços opcionais.
export const PRIVACY_NOTICE_KEY = "helena.privacyNotice.v1";

export function PrivacyNotice({ embedded = false }: { embedded?: boolean }) {
  useLanguage();

  const [visible, setVisible] = useState(() => {
    if (embedded) return true;
    try {
      return localStorage.getItem(PRIVACY_NOTICE_KEY) !== PRIVACY_POLICY_VERSION;
    } catch {
      return true;
    }
  });
  const [expanded, setExpanded] = useState(false);
  if (!visible) return null;
  return (
    <section
      className={embedded ? "profile-card privacy-information" : "privacy-notice"}
      aria-label={uiText(819)}
    >
      <header>
        <h2 className="section-label">{uiText(820)}</h2>
        <button
          type="button"
          className="privacy-notice__details"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? uiText(1888) : uiText(1889)}
        </button>
      </header>
      <p>{uiText(821)}</p>
      {expanded && (
        <div className="privacy-notice__information">
          <p>{uiText(822)}</p>
          <p>{uiText(823)}</p>
          <p>{uiText(824)}</p>
        </div>
      )}
      <footer>
        <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noreferrer">
          {uiText(825)}
        </a>
        {!embedded && (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              try {
                localStorage.setItem(PRIVACY_NOTICE_KEY, PRIVACY_POLICY_VERSION);
              } catch {
                /* Sem armazenamento, a confirmação vale até sair desta tela. */
              }
              setVisible(false);
            }}
          >
            {uiText(826)}
          </button>
        )}
      </footer>
    </section>
  );
}
