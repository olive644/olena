import { uiText, useLanguage } from "../i18n/runtime";
import "./profile-labels.css";
import { profileLabelNames } from "../domain/profile-labels";
export function ProfileLabels({ creks, username }: { creks: boolean; username: string }) {
  useLanguage();

  const labels = profileLabelNames(username, creks);
  if (!labels.length) return null;
  return (
    <span className="profile-labels">
      {labels.map((label) => (
        <span
          key={label}
          className={`profile-creks profile-label--${label.toLowerCase().replace(" ", "-")}`}
          aria-label={uiText(1899, [label])}
        >
          {label}
        </span>
      ))}
    </span>
  );
}
