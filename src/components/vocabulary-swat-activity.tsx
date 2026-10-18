import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import { Hand, Headphones, Printer, Trophy, Users } from "lucide-react";

const MATERIALS = localizeLabels(() => [uiText(1048), uiText(1049), uiText(1050)] as const);

const STEPS = localizeLabels(
  () => [uiText(1051), uiText(1052), uiText(1953), uiText(1053)] as const,
);

const HAND_TEMPLATES = Array.from({ length: 8 }, (_, index) => index + 1);
const TEAM_LINES = Array.from({ length: 4 }, (_, index) => index + 1);

export function VocabularySwatActivity() {
  useLanguage();

  return (
    <section className="swat-activity" aria-labelledby="swat-activity-title">
      <header className="swat-activity__header">
        <div>
          <span className="section-label">{uiText(1054)}</span>
          <h2 id="swat-activity-title">{uiText(1055)}</h2>
          <p>{uiText(1056)}</p>
        </div>
        <div className="swat-activity__tags" aria-label={uiText(1057)}>
          <span>
            <Headphones size={16} aria-hidden="true" /> {uiText(428)}
          </span>
          <span>
            <Users size={16} aria-hidden="true" /> {uiText(1058)}
          </span>
        </div>
      </header>

      <div className="swat-activity__layout">
        <div className="swat-activity__instructions">
          <div>
            <h3>{uiText(1059)}</h3>
            <p>{uiText(1060)}</p>
          </div>

          <div>
            <h3>{uiText(1061)}</h3>
            <ul>
              {MATERIALS.map((material) => (
                <li key={material}>{material}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3>{uiText(1062)}</h3>
            <ol>
              {STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <aside className="swat-activity__rule">
            <Trophy size={20} aria-hidden="true" />
            <p>
              <strong>{uiText(1063)}</strong> {uiText(1064)}
            </p>
          </aside>
        </div>

        <div className="swat-activity__print-area">
          <div className="swat-print-sheet" aria-label={uiText(1065)}>
            <header>
              <div>
                <span>{uiText(1066)}</span>
                <h3>{uiText(1067)}</h3>
              </div>
              <p>{uiText(1068)}</p>
            </header>

            <div className="swat-hand-grid">
              {HAND_TEMPLATES.map((number) => (
                <div role="img" aria-label={uiText(1954, [number])} key={number}>
                  <Hand strokeWidth={1.45} aria-hidden="true" />
                </div>
              ))}
            </div>

            <div className="swat-team-lines" aria-label={uiText(1069)}>
              {TEAM_LINES.map((number) => (
                <div key={number}>
                  <span aria-hidden="true" />
                  <p>{uiText(1070)}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            className="secondary-button swat-print-button"
            type="button"
            onClick={() => window.print()}
          >
            <Printer size={17} aria-hidden="true" /> {uiText(1071)}
          </button>
        </div>
      </div>
    </section>
  );
}
