import { uiText, useLanguage } from "../i18n/runtime";
import { useAppRelease } from "../data/app-release";

export function SettingsFooter() {
  useLanguage();
  const version = useAppRelease();

  return (
    <footer className="settings-footer" aria-label={uiText(1001)}>
      {/* Dicas inspiradas em david-mohseni, Uiverse.io; arte e tipografia do app. */}
      <div className="settings-social-links">
        {[
          [uiText(1946), "https://www.instagram.com/olenastudy.app/", "instagram"],
          [uiText(1947), "https://www.tiktok.com/@olena.app", "tiktok"],
        ].map(([label, href, icon]) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
            <img
              src={`/navigation-icons/paper/profile-${icon}.svg`}
              alt=""
              width="32"
              height="32"
              draggable={false}
            />
            <span className="settings-social-tooltip" aria-hidden="true">
              {label}
            </span>
          </a>
        ))}
      </div>
      <small>
        {uiText(1002)} {version}
      </small>
    </footer>
  );
}
