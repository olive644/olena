import { uiText, useLanguage } from "../i18n/runtime";
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
  useLanguage();

  const compact = variant === "compact";
  const className = `listening-online-notice listening-online-notice--${variant}`;

  if (choice === null) {
    return (
      <section className={className} aria-labelledby={`listening-online-title-${variant}`}>
        <h3 id={`listening-online-title-${variant}`}>{roomAudio ? uiText(1715) : uiText(404)}</h3>
        <p>
          {roomAudio ? uiText(405) : compact ? uiText(406) : uiText(407)}{" "}
          {roomAudio ? uiText(408) : uiText(409)} {uiText(410)}{" "}
          <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noopener noreferrer">
            {uiText(411)}
            <span className="sr-only"> {uiText(412)}</span>
          </a>
          .
        </p>
        <div className="listening-online-notice__actions">
          <button className="primary-button" type="button" onClick={() => onChoose("accepted")}>
            {uiText(413)}
          </button>
          <button className="secondary-button" type="button" onClick={() => onChoose("declined")}>
            {uiText(414)}
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
            ? uiText(1716)
            : uiText(415)
          : roomAudio
            ? uiText(416)
            : uiText(417)}
      </p>
      <button
        className="secondary-button"
        type="button"
        onClick={() => onChoose(accepted ? "declined" : "accepted")}
      >
        {accepted ? uiText(1717) : uiText(1718)}
      </button>
    </div>
  );
}
