import { useLanguage, uiText } from "../i18n/runtime";
import "./account-load-failed.css";

/**
 * Entrada de uma conta cuja leitura na nuvem falhou. O aparelho pode estar vazio (acabou de sair
 * da conta) e a nuvem inalcançável: isso não é uma conta nova, então nada de perguntas de
 * onboarding. O app tenta de novo sozinho; o botão só adianta.
 */
export function AccountLoadFailed({ onRetry }: { onRetry?: (() => void) | undefined }) {
  useLanguage();
  return (
    <main className="onboarding account-load-failed" id="main-content">
      <section className="account-load-failed__card" role="alert">
        <img src="/olena-favicon-180.png" alt="" width={64} height={64} />
        <h1>{uiText(3873)}</h1>
        <p>{uiText(3874)}</p>
        {onRetry && (
          <button type="button" className="primary-button" onClick={onRetry}>
            {uiText(611)}
          </button>
        )}
      </section>
    </main>
  );
}
