import { useState } from "react";
import { PRIVACY_POLICY_PATH, PRIVACY_POLICY_VERSION } from "../domain/privacy-policy";
import "./privacy-notice.css";

// É uma confirmação de leitura, não autoriza IA, voz ou serviços opcionais.
export const PRIVACY_NOTICE_KEY = "helena.privacyNotice.v1";

export function PrivacyNotice({ embedded = false }: { embedded?: boolean }) {
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
      aria-label="Privacidade no OlenaStudy"
    >
      <header>
        <h2 className="section-label">Privacidade</h2>
        <button
          type="button"
          className="privacy-notice__details"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Recolher" : "Ver detalhes"}
        </button>
      </header>
      <p>Usamos armazenamento necessário para sua conta, estudos e preferências.</p>
      {expanded && (
        <div className="privacy-notice__information">
          <p>Não usamos cookies de publicidade nem ferramentas de análise de comportamento.</p>
          <p>
            Recursos externos, como voz nos exercícios, pedem sua permissão separadamente. Este
            aviso não ativa nenhum deles.
          </p>
          <p>
            Você pode consultar estas informações em Perfil, Configurações, Privacidade e dados.
          </p>
        </div>
      )}
      <footer>
        <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noreferrer">
          Política de privacidade
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
            Entendi
          </button>
        )}
      </footer>
    </section>
  );
}
