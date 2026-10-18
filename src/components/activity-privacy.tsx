import { useState } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import { requestSocial } from "../data/profile-social";
import { useSocialFeed } from "../hooks/use-social-feed";
export function ActivityPrivacy({ enabled }: { enabled: boolean }) {
  useLanguage();
  const feed = useSocialFeed(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section
      className="profile-card profile-accessibility"
      aria-labelledby="activity-privacy-title"
    >
      <h2 id="activity-privacy-title">{uiText("Suas atividades")}</h2>
      <label>
        <span>
          <strong>{uiText("Mostrar atividades para todo mundo")}</strong>
          <small>
            {uiText(
              "Compartilhe novas conquistas de prática, foco e sequências. Conteúdo dos seus estudos nunca é publicado. Ao desativar, as atividades e curtidas são removidas.",
            )}
          </small>
        </span>
        <input
          type="checkbox"
          disabled={!feed || busy}
          checked={feed?.activitySharing ?? true}
          onChange={async (event) => {
            setBusy(true);
            setError("");
            try {
              await requestSocial({ action: "activity-privacy", enabled: event.target.checked });
            } catch {
              setError(uiText("Não foi possível atualizar a privacidade. Tente novamente."));
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {!enabled && <p>{uiText("Entre na conta para gerenciar atividades compartilhadas.")}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
