import { uiText, useLanguage } from "../i18n/runtime";
import { useState } from "react";
import {
  PRIVACY_CONSENT_CHANGED,
  readPrivacyConsent,
  recordPrivacyConsent,
  PRIVACY_POLICY_PATH,
  PRIVACY_POLICY_VERSION,
} from "../domain/privacy-policy";
import "./privacy-notice.css";
import { LibraryDialog } from "./library-dialog";
import { PaperArrow } from "./paper-arrow";

// É uma confirmação de leitura, não autoriza IA, voz ou serviços opcionais.
export const PRIVACY_NOTICE_KEY = "helena.privacyNotice.v1";

function PrivacyRenewal({ onClose }: { onClose(): void }) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(false);
  return (
    <LibraryDialog
      title={uiText("Política de Privacidade atualizada")}
      onClose={onClose}
      className="privacy-renewal"
    >
      <p>
        {uiText(
          "A política atual explica a presença no Olena e o contador público no Discord, que mostra somente o total de contas online.",
        )}
      </p>
      <p>{uiText("Sua conta continua conectada. A presença só começa após sua confirmação.")}</p>
      <p>
        {uiText(
          "A prática de fala de Inglês é opcional e pede autorização separada para usar o microfone e o reconhecimento do navegador.",
        )}
      </p>
      <a
        className="secondary-button"
        href={PRIVACY_POLICY_PATH}
        target="_blank"
        rel="noopener noreferrer"
      >
        {uiText(825)} <PaperArrow />
      </a>
      <label className="privacy-renewal__consent">
        <input
          className="paper-checkbox"
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        {uiText("Li e concordo com a Política de Privacidade atualizada.")}
      </label>
      {error && (
        <p role="alert">
          {uiText("Não foi possível salvar o aceite neste navegador. Tente novamente.")}
        </p>
      )}
      <footer>
        <button type="button" className="secondary-button" onClick={onClose}>
          {uiText("Agora não")}
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!accepted}
          onClick={() => {
            recordPrivacyConsent(localStorage);
            if (readPrivacyConsent(localStorage)?.version !== PRIVACY_POLICY_VERSION) {
              setError(true);
              return;
            }
            window.dispatchEvent(new Event(PRIVACY_CONSENT_CHANGED));
            onClose();
          }}
        >
          {uiText("Confirmar aceite")}
        </button>
      </footer>
    </LibraryDialog>
  );
}
export function PrivacyNotice({
  embedded = false,
  authenticated = false,
}: {
  embedded?: boolean;
  authenticated?: boolean;
}) {
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
  const [renewalDismissed, setRenewalDismissed] = useState(false);
  if (
    authenticated &&
    !embedded &&
    !renewalDismissed &&
    readPrivacyConsent(localStorage)?.version !== PRIVACY_POLICY_VERSION
  )
    return (
      <PrivacyRenewal
        onClose={() => {
          setRenewalDismissed(true);
          setVisible(false);
        }}
      />
    );
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
        <a
          className="secondary-button"
          href={PRIVACY_POLICY_PATH}
          target="_blank"
          rel="noopener noreferrer"
        >
          {uiText(825)} <PaperArrow />
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
