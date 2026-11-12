import { uiText, useLanguage } from "../i18n/runtime";
import { useProfileStudy } from "../hooks/use-profile-study";
import { PaperDigits } from "./paper-digits";
import { RoomPointsIcon } from "./room-paper-icons";
// Mantidos como estavam: o Perfil continua carregando estes estilos junto com este módulo.
import "../practice-islands.css";
import "../solo-journey.css";
import "./profile-study-widgets.css";

export function ProfileXpBar() {
  useLanguage();

  const stats = useProfileStudy();
  return (
    <div className="profile-xp" title={uiText(950)}>
      <div>
        <strong>
          <RoomPointsIcon xp /> {uiText(449)} {stats.level}
        </strong>
        <span>
          {stats.current} / {stats.next} {uiText(468)}
        </span>
      </div>
      <progress aria-label={uiText(951)} value={stats.current} max={stats.next} />
    </div>
  );
}
export function ProfileLevelBadge({ level: publicLevel }: { level?: number } = {}) {
  useLanguage();

  const { level: ownLevel } = useProfileStudy();
  const level = publicLevel ?? ownLevel;
  return (
    <span className="profile-level-badge" aria-label={uiText(1733, [level])}>
      <small>{uiText(464)}</small>
      <PaperDigits value={String(level)} />
    </span>
  );
}
