import { PRIVACY_POLICY_PATH } from "../domain/privacy-policy";
import type { ListeningOnlineChoice } from "../data/listening-consent";

type ListeningOnlineNoticeProps = {
  choice: ListeningOnlineChoice | null;
  onChoose: (choice: ListeningOnlineChoice) => void;
  /** "card" pede a escolha em destaque; "compact" cabe na tela de jogo e na sala. */
  variant?: "card" | "compact";
  roomAudio?: boolean;
};

// Pede, com clareza, o aceite para enviar a uma empresa parceira o texto das frases (voz
// natural) e, no Quiz, cada palavra em inglês (dificuldade). Sem aceite, nada é
// enviado pelo aparelho. O Quiz pode usar a voz local; a Sala não substitui o áudio.
export function ListeningOnlineNotice({
  choice,
  onChoose,
  variant = "card",
  roomAudio = false,
}: ListeningOnlineNoticeProps) {
  const compact = variant === "compact";
  const className = `listening-online-notice listening-online-notice--${variant}`;

  if (choice === null) {
    return (
      <section className={className} aria-labelledby={`listening-online-title-${variant}`}>
        <h3 id={`listening-online-title-${variant}`}>
          {roomAudio ? "Voz da sala (opcional)" : "Voz natural e vocabulário online (opcional)"}
        </h3>
        <p>
          {roomAudio
            ? "Para ouvir a gravação da sala, o texto curto da pergunta é enviado a uma empresa parceira de voz. Nada é ligado à sua conta."
            : compact
              ? "Para uma voz mais natural, o texto de cada frase é enviado a uma empresa parceira de voz, e cada palavra em inglês vai a um serviço de consulta de vocabulário. Nada é ligado à sua conta."
              : "Para deixar a voz mais natural, o texto de cada frase (até 160 caracteres) é enviado a uma empresa parceira de voz. Para estimar a dificuldade das palavras, cada palavra em inglês é enviada a um serviço de consulta de vocabulário. Nada disso é ligado à sua conta e você pode mudar de ideia quando quiser."}{" "}
          {roomAudio
            ? "Na sala, a gravação fica disponível em armazenamento privado por 1 hora para todos ouvirem a mesma voz. Cópias vencidas são apagadas diariamente. Sem permissão, esta sala não reproduz áudio no seu aparelho."
            : "Sem isso, usamos a voz do seu aparelho e uma estimativa própria de dificuldade."}{" "}
          Saiba mais na{" "}
          <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noopener noreferrer">
            Política de Privacidade<span className="sr-only"> (abre em uma nova aba)</span>
          </a>
          .
        </p>
        <div className="listening-online-notice__actions">
          <button className="primary-button" type="button" onClick={() => onChoose("accepted")}>
            Permitir
          </button>
          <button className="secondary-button" type="button" onClick={() => onChoose("declined")}>
            Agora não
          </button>
        </div>
      </section>
    );
  }

  const accepted = choice === "accepted";
  return (
    <div className={className} role="status">
      <p>
        {accepted
          ? roomAudio
            ? "Voz da sala: ativada."
            : "Voz natural e vocabulário online: ativados."
          : roomAudio
            ? "Voz natural desativada. Ative para ouvir o áudio da sala."
            : "Voz natural e vocabulário online: desativados. Usamos a voz do seu aparelho."}
      </p>
      <button
        className="secondary-button"
        type="button"
        onClick={() => onChoose(accepted ? "declined" : "accepted")}
      >
        {accepted ? "Desativar" : "Ativar"}
      </button>
    </div>
  );
}
