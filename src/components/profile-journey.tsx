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
  // O @ vazio durante a consulta não significa que o usuário deixou uma etapa em branco.
  const checkingIdentity = !username && verification !== undefined && verification !== "confirmed";
  const pending = checkingIdentity ? undefined : next;
  return (
    <section className="profile-journey" aria-label="Complete seu perfil" data-complete={!next}>
      <div className="profile-journey__copy" aria-live="polite">
        <small
          title={
            verification === "offline"
              ? "A Olena ainda não confirmou os dados salvos na conta. Suas escolhas continuam aqui."
              : undefined
          }
        >
          {checkingIdentity
            ? "CONFERINDO COM A OLENA"
            : next
              ? `SEU PERFIL · ${completed} DE 3 ETAPAS`
              : "FICOU ÓTIMO!"}
        </small>
        <h2>
          {checkingIdentity
            ? "Carregando seu perfil"
            : (next?.title ?? "Seu perfil está perfeito.")}
        </h2>
        <p>
          {checkingIdentity
            ? "Suas escolhas salvas estão sendo conferidas."
            : (next?.detail ?? "Agora é só espalhar suas descobertas por aqui.")}
        </p>
      </div>
      {!checkingIdentity && (
        <img
          src={`/profile-journey/helena-${pending?.id ?? "complete"}.webp`}
          width="120"
          height="120"
          alt=""
          draggable={false}
        />
      )}
      {pending && (
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
      )}
      {pending ? (
        <button
          type="button"
          className="primary-button profile-journey__continue"
          onClick={() => onChoose(pending.id)}
        >
          {pending.action}
        </button>
      ) : !checkingIdentity ? (
        <button
          type="button"
          className="primary-button profile-journey__continue"
          onClick={() => onChoose("identity")}
        >
          Revisar meu perfil
        </button>
      ) : null}
    </section>
  );
}
