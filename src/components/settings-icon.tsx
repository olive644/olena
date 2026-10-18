export type SettingsIconName =
  | "account"
  | "appearance"
  | "study"
  | "notebooks"
  | "notifications"
  | "data"
  | "security"
  | "support";

// Mesma arte facetada em SVG estático, sem carregar paths no JavaScript.
export function SettingsIcon({ name }: { name: SettingsIconName }) {
  return (
    <img
      className="settings-paper-icon"
      src={`/navigation-icons/paper/settings-${name}.svg`}
      width="32"
      height="32"
      alt=""
      draggable={false}
    />
  );
}
