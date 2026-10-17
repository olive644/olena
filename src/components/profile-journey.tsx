import type { ProfileCompletion, ProfileStep } from "../domain/profile-completion";
import { PaperCloseIcon } from "./paper-close-icon";

const recommendations = {
  identity: {
    title: "Quem é você?",
    detail: "Seu nome e um @ só seu.",
    action: "Escolher meu nome",
  },
  avatar: {
    title: "Qual é o seu personagem?",
    detail: "Um companheiro com a sua cara.",
    action: "Escolher personagem",
  },
  cover: {
    title: "Seu pequeno universo",
    detail: "Escolha um cenário para chamar de seu.",
    action: "Escolher minha capa",
  },
};

export function ProfileJourney({
  completion,
  onChoose,
  onDismiss,
}: {
  completion: ProfileCompletion;
  onChoose: (step: ProfileStep) => void;
  onDismiss: () => void;
}) {
  if (completion.complete || !completion.next) return null;
  const pending = completion.steps.filter((step) => !step.done);
  const nextId = completion.next;
  const next = recommendations[nextId];
  return (
    <section className="profile-journey" aria-label="Complete seu perfil">
      <button
        type="button"
        className="profile-journey-close"
        aria-label="Dispensar recomendação de perfil"
        onClick={onDismiss}
      >
        <PaperCloseIcon />
      </button>
      <div className="profile-journey__copy" aria-live="polite">
        <small>{pending.length === 1 ? "FALTA 1 ETAPA" : `FALTAM ${pending.length} ETAPAS`}</small>
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
      <ol aria-label="Etapas pendentes do perfil">
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
