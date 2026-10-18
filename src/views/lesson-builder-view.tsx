import { uiText, useLanguage } from "../i18n/runtime";
import { useState, type FormEvent } from "react";
import { PageHeader } from "../components/app-navigation";
import { PaperArrow } from "../components/paper-arrow";
import { VocabularySwatActivity } from "../components/vocabulary-swat-activity";
import {
  ACTIVITY_LIBRARY,
  findActivity,
  listActivitiesByControlLevel,
} from "../domain/activity-bank";
import { createLessonDraft } from "../domain/create-lesson-draft";
import {
  CEFR_LEVELS,
  METHODOLOGIES,
  METHODOLOGY_LABELS,
  PRODUCTION_VARIANTS,
  PRODUCTION_VARIANT_LABELS,
  type LessonDraft,
  type LessonInput,
} from "../domain/lesson";

const INITIAL_INPUT: LessonInput = {
  topic: "",
  level: "A2",
  duration: 60,
  audience: "",
  aim: "",
  objective: "",
  methodology: "inductive",
  practiceTotalControlledId: "",
  practiceSemiControlledId: "",
  extraActivityId: "",
  productionVariant: "product-pitch",
  homeworkLinksText: "",
};

const TOTAL_CONTROLLED_ACTIVITIES = listActivitiesByControlLevel("total-controlled");
const SEMI_CONTROLLED_ACTIVITIES = listActivitiesByControlLevel("semi-controlled");

function DraftPreview({ draft }: { draft: LessonDraft | null }) {
  useLanguage();

  if (!draft) {
    return (
      <aside className="preview preview--empty" aria-live="polite">
        <span className="preview-empty-mark" aria-hidden="true">
          {uiText(1276)}
        </span>
        <h2>{uiText(1277)}</h2>
        <p>{uiText(1278)}</p>
      </aside>
    );
  }

  return (
    <aside className="preview" aria-live="polite" aria-labelledby="draft-title">
      <div className="preview__topline">
        <span>{uiText(1279)}</span>
        <div className="draft-meta">
          <span>{draft.level}</span>
          <span>
            {draft.duration} {uiText(19)}
          </span>
        </div>
      </div>
      <h2 id="draft-title">{draft.title}</h2>
      <p className="draft-audience">{draft.audience}</p>
      <div className="objective">
        <span>{uiText(1280)}</span>
        <p>{draft.aim}</p>
      </div>
      <div className="objective">
        <span>{uiText(1281)}</span>
        <p>{draft.objective}</p>
      </div>
      <ol className="timeline">
        {draft.sections.map((section, index) => (
          <li key={section.kind}>
            <span className="timeline__number">{String(index + 1).padStart(2, "0")}</span>
            <div className="timeline__content">
              <div>
                <strong>{section.title}</strong>
                <span>
                  {section.minutes} {uiText(19)}
                </span>
              </div>
              <p>{section.guidance}</p>
              {section.activityIds?.map((activityId) => {
                const activity = findActivity(activityId);
                if (!activity) return null;
                return (
                  <div className="activity-detail" key={activityId}>
                    <strong>{activity.name}</strong>
                    <span>
                      {activity.time} {uiText(1282)} {activity.topic}
                    </span>
                    <p>{activity.goal}</p>
                    <ol>
                      {activity.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    {activity.supplies.length > 0 && (
                      <p className="activity-detail__supplies">
                        {uiText(1283)} {activity.supplies.join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
              {section.links && section.links.length > 0 && (
                <ul className="homework-links">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="preview__footnote">{uiText(1284)}</p>
    </aside>
  );
}

export function LessonBuilderView({ onBack }: { onBack: () => void }) {
  useLanguage();

  const [input, setInput] = useState<LessonInput>(INITIAL_INPUT);
  const [draft, setDraft] = useState<LessonDraft | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDraft(createLessonDraft(input));
  }

  return (
    <main className="main-content builder" id="main-content">
      <PageHeader />
      <header className="builder__header">
        <button className="back-button" type="button" onClick={onBack} aria-label={uiText(1153)}>
          <PaperArrow back />
        </button>
        <div>
          <span className="section-label">{uiText(1154)}</span>
          <h1>{uiText(1285)}</h1>
          <p>{uiText(1286)}</p>
        </div>
      </header>

      <VocabularySwatActivity />

      <div className="builder-grid">
        <form className="lesson-form" onSubmit={submit}>
          <div className="form-heading">
            <h2>{uiText(1287)}</h2>
            <span>{uiText(1288)}</span>
          </div>
          <label className="field field--full">
            <span>{uiText(1289)}</span>
            <input
              name="topic"
              value={input.topic}
              onChange={(event) => setInput({ ...input, topic: event.target.value })}
              placeholder={uiText(1290)}
              required
              autoComplete="off"
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>{uiText(1291)}</span>
              <select
                name="level"
                value={input.level}
                onChange={(event) =>
                  setInput({ ...input, level: event.target.value as LessonInput["level"] })
                }
              >
                {CEFR_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{uiText(17)}</span>
              <select
                name="duration"
                value={input.duration}
                onChange={(event) => setInput({ ...input, duration: Number(event.target.value) })}
              >
                {[30, 45, 60, 90, 120].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} {uiText(1292)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field field--full">
            <span>{uiText(1293)}</span>
            <input
              name="audience"
              value={input.audience}
              onChange={(event) => setInput({ ...input, audience: event.target.value })}
              placeholder={uiText(1294)}
              autoComplete="off"
            />
          </label>
          <label className="field field--full">
            <span>{uiText(1280)}</span>
            <small className="field-help">{uiText(1295)}</small>
            <textarea
              name="aim"
              value={input.aim}
              onChange={(event) => setInput({ ...input, aim: event.target.value })}
              placeholder={uiText(1296)}
              rows={2}
            />
          </label>
          <label className="field field--full">
            <span>{uiText(1281)}</span>
            <small className="field-help">{uiText(1297)}</small>
            <textarea
              name="objective"
              value={input.objective}
              onChange={(event) => setInput({ ...input, objective: event.target.value })}
              placeholder={uiText(1298)}
              rows={3}
            />
          </label>
          <fieldset className="method-fieldset">
            <legend>{uiText(1299)}</legend>
            <small className="field-help">{uiText(1300)}</small>
            <div className="field-row">
              <label className="field">
                <span>{uiText(1301)}</span>
                <select
                  name="practiceTotalControlledId"
                  value={input.practiceTotalControlledId}
                  onChange={(event) =>
                    setInput({ ...input, practiceTotalControlledId: event.target.value })
                  }
                >
                  <option value="">{uiText(1302)}</option>
                  {TOTAL_CONTROLLED_ACTIVITIES.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{uiText(1303)}</span>
                <select
                  name="practiceSemiControlledId"
                  value={input.practiceSemiControlledId}
                  onChange={(event) =>
                    setInput({ ...input, practiceSemiControlledId: event.target.value })
                  }
                >
                  <option value="">{uiText(1302)}</option>
                  {SEMI_CONTROLLED_ACTIVITIES.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
          <label className="field field--full">
            <span>{uiText(1304)}</span>
            <small className="field-help">{uiText(1305)}</small>
            <select
              name="extraActivityId"
              value={input.extraActivityId}
              onChange={(event) => setInput({ ...input, extraActivityId: event.target.value })}
            >
              <option value="">{uiText(1302)}</option>
              {ACTIVITY_LIBRARY.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="method-fieldset">
            <legend>{uiText(1306)}</legend>
            <div className="method-grid">
              {METHODOLOGIES.map((methodology) => (
                <label className="method-option" key={methodology}>
                  <input
                    type="radio"
                    name="methodology"
                    value={methodology}
                    checked={input.methodology === methodology}
                    onChange={() => setInput({ ...input, methodology })}
                  />
                  <span>{uiText(METHODOLOGY_LABELS[methodology])}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="method-fieldset">
            <legend>{uiText(1307)}</legend>
            <div className="method-grid">
              {PRODUCTION_VARIANTS.map((variant) => (
                <label className="method-option" key={variant}>
                  <input
                    type="radio"
                    name="productionVariant"
                    value={variant}
                    checked={input.productionVariant === variant}
                    onChange={() => setInput({ ...input, productionVariant: variant })}
                  />
                  <span>{PRODUCTION_VARIANT_LABELS[variant]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field field--full">
            <span>{uiText(1308)}</span>
            <small className="field-help">{uiText(1309)}</small>
            <textarea
              name="homeworkLinksText"
              value={input.homeworkLinksText}
              onChange={(event) => setInput({ ...input, homeworkLinksText: event.target.value })}
              placeholder={"https://exemplo.com/exercicio-1\nhttps://exemplo.com/exercicio-2"}
              rows={2}
            />
          </label>
          <button className="primary-button primary-button--wide" type="submit">
            {uiText(1310)}
          </button>
        </form>
        <DraftPreview draft={draft} />
      </div>
    </main>
  );
}

export default LessonBuilderView;
