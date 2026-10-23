import { useEffect, useRef, useState } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import { useMathAchievements } from "../hooks/use-math-achievements";
import type { WorkspaceState } from "../domain/workspace";
import { AchievementArt, AchievementCollection } from "./math-achievements";
import type { Achievement } from "../domain/math-achievements";
import { PaperCloseIcon } from "./paper-close-icon";
import { useProfilePresentation } from "../hooks/use-profile-presentation";

// O saldo é derivado dos registros da conta; esta fila existe só nesta sessão.
export function AchievementAnnouncer({
  workspace,
  username,
  nameFallback,
}: {
  workspace: WorkspaceState;
  username: string;
  nameFallback: string;
}) {
  useLanguage();
  const values = useMathAchievements(workspace);
  useProfilePresentation(username, nameFallback, workspace);
  const earned = values.filter((item) => item.earned);
  const signature = earned.map((item) => item.id).join(",");
  const previous = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [inspect, setInspect] = useState(false);
  useEffect(() => {
    const ids = signature ? signature.split(",") : [];
    if (previous.current) {
      const newIds = ids.filter((id) => !previous.current!.has(id));
      if (newIds.length)
        setQueue((old) => [...old, ...values.filter((item) => newIds.includes(item.id))]);
    }
    previous.current = new Set(ids);
  }, [signature, values]);
  const item = queue[0];
  if (!item) return null;
  return (
    <aside className="achievement-notice" aria-label={uiText("Nova conquista")}>
      <AchievementArt item={item} />
      <div role="status">
        <strong>{uiText("Parabéns! Conquista desbloqueada")}</strong>
        <span>
          {uiText(item.name)} · {item.target}
        </span>
        <button type="button" className="secondary-button" onClick={() => setInspect(!inspect)}>
          {uiText("Inspecionar")}
        </button>
      </div>
      <button
        type="button"
        className="icon-button"
        aria-label={uiText("Fechar conquista")}
        onClick={() => {
          setQueue((old) => old.slice(1));
          setInspect(false);
        }}
      >
        <PaperCloseIcon />
      </button>
      {inspect && (
        <div className="achievement-notice-collection">
          <AchievementCollection
            ids={[item.id]}
            values={values}
            ownerName={nameFallback}
            compact
            initialId={item.id}
          />
        </div>
      )}
    </aside>
  );
}
