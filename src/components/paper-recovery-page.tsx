import { PaperCardTitle } from "./paper-card-title";
import { PaperDigits } from "./paper-digits";
import { uiText } from "../i18n/runtime";

/** Também renderiza antes do catálogo e sem depender dos módulos do aplicativo. */
export function PaperRecoveryPage({
  title,
  description,
  homeLabel,
  retryLabel,
  onRetry,
  notFound = false,
}: {
  title: string;
  description: string;
  homeLabel: string;
  retryLabel?: string;
  onRetry?: () => void;
  notFound?: boolean;
}) {
  return (
    <main className="paper-recovery" id="main-content">
      <header className="paper-recovery__brand">
        <img src="/olena-favicon-180.png" width="32" height="32" alt="" />
        <PaperCardTitle value="OlenaStudy" />
      </header>
      <section className="paper-recovery__sheet" aria-labelledby="recovery-title">
        <div className="paper-recovery__scene" aria-hidden="true">
          <div className="paper-recovery__code">
            {notFound ? <PaperDigits value="404" /> : <PaperCardTitle value="Ops" />}
          </div>
          <img
            className="paper-recovery__olena"
            src="/helena-onboarding-step-1-cutout.webp"
            alt=""
            width="640"
            height="640"
          />
        </div>
        <div className="paper-recovery__copy">
          <h1 id="recovery-title">{title}</h1>
          <p>{description}</p>
          <div className="paper-recovery__actions">
            {onRetry && (
              <button type="button" onClick={onRetry}>
                {retryLabel}
              </button>
            )}
            <a href="/" className={onRetry ? "is-secondary" : ""}>
              <img src="/paper-arrow.svg" alt="" width="28" height="28" />
              {homeLabel}
            </a>
          </div>
        </div>
      </section>
      <footer className="paper-recovery__footer">
        <img src="/olena-favicon-180.png" alt="" width="24" height="24" />
        <img src="/galeria-oli-icon.svg" alt="" width="24" height="24" />
        <span>{uiText("Galeria.Oli · OlenaStudy")}</span>
      </footer>
    </main>
  );
}
