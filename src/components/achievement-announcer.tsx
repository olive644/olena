import { useEffect, useRef, useState, type CSSProperties } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import { useMathAchievements } from "../hooks/use-math-achievements";
import type { WorkspaceState } from "../domain/workspace";
import { AchievementArt, AchievementCollection } from "./math-achievements";
import type { Achievement } from "../domain/math-achievements";
import { PaperCloseIcon } from "./paper-close-icon";
import { useProfilePresentation } from "../hooks/use-profile-presentation";
import { createMathSound } from "../data/math-sound";
import { PaperCardTitle } from "./paper-card-title";

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
  useProfilePresentation(username, nameFallback, workspace, values);
  const earned = values.filter((item) => item.earned);
  const signature = earned.map((item) => item.id).join(",");
  const previous = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [inspect, setInspect] = useState(false);
  const [held, setHeld] = useState(false);
  const [editing, setEditing] = useState(false);
  const sound = useRef<ReturnType<typeof createMathSound> | null>(null);
  useEffect(() => {
    const sync = () => setEditing(!!document.querySelector(".handwriting-studio"));
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const audio = createMathSound();
    sound.current = audio;
    const unlock = () => audio.unlock();
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      audio.dispose();
    };
  }, []);
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
  useEffect(() => {
    if (item && !editing)
      sound.current?.play(
        item.rarity === "rare"
          ? "achievementRare"
          : item.rarity === "uncommon"
            ? "achievementUncommon"
            : "achievementCommon",
      );
  }, [item, editing]);
  useEffect(() => {
    if (!item || inspect || held || editing) return;
    const timer = window.setTimeout(() => setQueue((old) => old.slice(1)), 10000);
    return () => clearTimeout(timer);
  }, [item, inspect, held, editing]);
  if (!item || editing) return null;
  return (
    <aside className="achievement-notice" data-rarity={item.rarity} aria-label={uiText(2802)}>
      <div
        key={item.id}
        className="achievement-celebration-card"
        onFocusCapture={() => setHeld(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false);
        }}
      >
        <div className="achievement-celebration-burst" aria-hidden="true">
          {Array.from({ length: 16 }, (_, index) => (
            <i key={index} style={{ "--spark-index": index } as CSSProperties} />
          ))}
        </div>
        <AchievementArt item={item} />
        <div role="status">
          <strong>
            <PaperCardTitle value={uiText(2803)} />
          </strong>
          <span>
            {uiText(item.name)} · {item.target}
          </span>
          <button type="button" className="secondary-button" onClick={() => setInspect(!inspect)}>
            {uiText(2804)}
          </button>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={uiText(2797)}
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
              onInspectionClose={() => setInspect(false)}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
