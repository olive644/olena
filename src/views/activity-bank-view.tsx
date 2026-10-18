import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import { useState } from "react";
import { PageHeader } from "../components/app-navigation";
import { PaperArrow } from "../components/paper-arrow";
import {
  ACTIVITY_LIBRARY,
  CONTROL_LEVEL_LABELS,
  type ActivityDefinition,
  type ControlLevel,
} from "../domain/activity-bank";

type FilterValue = ControlLevel | "all";

const FILTERS: { value: FilterValue; label: string }[] = localizeLabels(() => [
  { value: "all", label: uiText(1724) },
  { value: "total-controlled", label: CONTROL_LEVEL_LABELS["total-controlled"] },
  { value: "semi-controlled", label: CONTROL_LEVEL_LABELS["semi-controlled"] },
]);

function ActivityCard({ activity }: { activity: ActivityDefinition }) {
  useLanguage();

  return (
    <article className="bank-card">
      <div className="bank-card__heading">
        <h3>{activity.name}</h3>
        <span className={`bank-tag bank-tag--${activity.controlLevel}`}>
          {CONTROL_LEVEL_LABELS[activity.controlLevel]}
        </span>
      </div>
      <dl className="bank-card__meta">
        <div>
          <dt>{uiText(1148)}</dt>
          <dd>
            {activity.time} {uiText(19)}
          </dd>
        </div>
        <div>
          <dt>{uiText(1149)}</dt>
          <dd>{activity.topic}</dd>
        </div>
      </dl>
      <div className="bank-card__block">
        <span>{uiText(1150)}</span>
        <p>{activity.goal}</p>
      </div>
      <div className="bank-card__block">
        <span>{uiText(1151)}</span>
        <ol>
          {activity.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      {activity.supplies.length > 0 && (
        <div className="bank-card__block">
          <span>{uiText(1152)}</span>
          <p>{activity.supplies.join(", ")}</p>
        </div>
      )}
      {activity.links.length > 0 && (
        <div className="bank-card__block">
          <span>{uiText(37)}</span>
          <ul className="homework-links">
            {activity.links.map((link) => (
              <li key={link}>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export function ActivityBankView({ onBack }: { onBack: () => void }) {
  useLanguage();

  const [filter, setFilter] = useState<FilterValue>("all");
  const activities =
    filter === "all"
      ? ACTIVITY_LIBRARY
      : ACTIVITY_LIBRARY.filter((activity) => activity.controlLevel === filter);

  return (
    <main className="main-content" id="main-content">
      <PageHeader />
      <header className="builder__header">
        <button className="back-button" type="button" onClick={onBack} aria-label={uiText(1153)}>
          <PaperArrow back />
        </button>
        <div>
          <span className="section-label">{uiText(1154)}</span>
          <h1>{uiText(1155)}</h1>
          <p>
            {ACTIVITY_LIBRARY.length} {uiText(1156)}
          </p>
        </div>
      </header>

      <div className="bank-filters" role="group" aria-label={uiText(1157)}>
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={filter === option.value ? "bank-filter bank-filter--active" : "bank-filter"}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="bank-grid">
        {activities.map((activity) => (
          <ActivityCard activity={activity} key={activity.id} />
        ))}
      </div>
    </main>
  );
}

export default ActivityBankView;
