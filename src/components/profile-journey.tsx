import type { StoredProfile } from "../domain/profile-identity";
import { profileCompletion } from "../domain/profile-completion";

export function ProfileJourney({
  profile,
  username,
  onChoose,
  verification,
}: {
  profile: StoredProfile;
  username: string;
  onChoose: (step: "identity" | "avatar" | "cover") => void;
  verification?: "confirmed" | "pending" | "offline";
}) {
  const completion = profileCompletion(profile, username);
  const steps = [
    {
      id: "identity",
      title: "Quem é você?",
      detail: "Seu nome e um @ só seu.",
      done: completion.steps[0]!.done,
      action: "Escolher meu nome",
    },
    {
      id: "avatar",
      title: "Qual é o seu personagem?",
      detail: "Um companheiro com a sua cara.",
      done: completion.steps[1]!.done,
      action: "Escolher personagem",
    },
    {
      id: "cover",
      title: "Seu pequeno universo",
      detail: "Escolha um cenário para chamar de seu.",
      done: completion.steps[2]!.done,
      action: "Escolher minha capa",
    },
  ] as const;
  const next = steps.find((step) => !step.done);
  const completed = steps.filter((step) => step.done).length;
  return (
    <section className="profile-journey" aria-label="Complete seu perfil" data-complete={!next}>
      <div className="profile-journey__copy" key={next?.id ?? "complete"} aria-live="polite">
        <small
          title={
            verification === "offline"
              ? "A Olena ainda não confirmou os dados salvos na conta. Suas escolhas continuam aqui."
              : undefined
          }
        >
          {verification === "pending"
            ? "CONFERINDO COM A OLENA"
            : verification === "offline"
              ? "CONFIRMAÇÃO PENDENTE"
              : next
                ? `SEU PERFIL · ${completed} DE 3 ETAPAS`
                : "FICOU ÓTIMO!"}
        </small>
        <h2>
          {next?.title ??
            (verification && verification !== "confirmed"
              ? "Suas escolhas estão prontas."
              : "Seu perfil está perfeito.")}
        </h2>
        <p>{next?.detail ?? "Agora é só espalhar suas descobertas por aqui."}</p>
      </div>
      <img
        key={next?.id ?? "complete"}
        src={`/profile-journey/helena-${next?.id ?? "complete"}.webp`}
        width="120"
        height="120"
        alt=""
        draggable={false}
      />
      <ol aria-label="Etapas do perfil">
        {steps.map((step) => (
          <li key={step.id}>
            <button
              type="button"
              aria-label={`${step.title} ${step.done ? "Concluído" : "Pendente"}`}
              aria-current={next?.id === step.id ? "step" : undefined}
              onClick={() => onChoose(step.id)}
              data-done={step.done}
            >
              {step.done ? "✓" : steps.indexOf(step) + 1}
            </button>
          </li>
        ))}
      </ol>
      {next ? (
        <button
          type="button"
          className="primary-button profile-journey__continue"
          onClick={() => onChoose(next.id)}
        >
          {next.action}
        </button>
      ) : (
        <button
          type="button"
          className="primary-button profile-journey__continue"
          onClick={() => onChoose("identity")}
        >
          Revisar meu perfil
        </button>
      )}
    </section>
  );
}
