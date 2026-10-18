import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import type { ProfileCompletion, ProfileStep } from "../domain/profile-completion";
import { PaperCloseIcon } from "./paper-close-icon";

const recommendations = localizeLabels(() => ({
  identity: {
    title: uiText(854),
    detail: uiText(855),
    action: uiText(1894),
  },
  avatar: {
    title: uiText(856),
    detail: uiText(857),
    action: uiText(1895),
  },
  cover: {
    title: uiText(858),
    detail: uiText(859),
    action: uiText(1896),
  },
}));

export function ProfileJourney({
  completion,
  onChoose,
  onDismiss,
}: {
  completion: ProfileCompletion;
  onChoose: (step: ProfileStep) => void;
  onDismiss: () => void;
}) {
  useLanguage();

  if (completion.complete || !completion.next) return null;
  const pending = completion.steps.filter((step) => !step.done);
  const nextId = completion.next;
  const next = recommendations[nextId];
  return (
    <section className="profile-journey" aria-label={uiText(860)}>
      <button
        type="button"
        className="profile-journey-close"
        aria-label={uiText(861)}
        onClick={onDismiss}
      >
        <PaperCloseIcon />
      </button>
      <div className="profile-journey__copy" aria-live="polite">
        <small>{pending.length === 1 ? uiText(1897) : uiText(1898, [pending.length])}</small>
        <h2>{next.title}</h2>
        <p>{next.detail}</p>
      </div>
      <img
        src={`/profile-journey/helena-${nextId}.webp`}
        width="120"
        height="120"
        alt=""
        draggable={false}
      />
      <ol aria-label={uiText(862)}>
        {pending.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              aria-label={recommendations[step.id].title}
              aria-current={nextId === step.id ? "step" : undefined}
              onClick={() => onChoose(step.id)}
            >
              {index + 1}
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="primary-button profile-journey__continue"
        onClick={() => onChoose(nextId)}
      >
        {next.action}
      </button>
    </section>
  );
}
