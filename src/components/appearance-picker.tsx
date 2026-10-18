import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import { useEffect, useRef } from "react";
import { useTheme, type ThemePreference } from "../hooks/use-theme";
import { NavigationIcon } from "./navigation-icon";

const OPTIONS: readonly { value: ThemePreference; label: string }[] = localizeLabels(() => [
  { value: "light", label: uiText(1616) },
  { value: "dark", label: uiText(1617) },
  { value: "system", label: uiText(1618) },
]);

/* Botão único de aparência: mostra o ícone do tema oposto ao ativo (convite
   para trocar) e abre a folha de papel com as três opções de aparência.
   "header" é o botão quadrado isolado do cabeçalho (desktop); "nav" imita um
   item comum da barra inferior móvel, com rótulo abaixo do ícone. */
export function AppearanceToggle({ variant = "header" }: { variant?: "header" | "nav" }) {
  useLanguage();

  const { theme, preference, setThemePreference } = useTheme();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") detailsRef.current?.removeAttribute("open");
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  const icon = <NavigationIcon name={theme === "dark" ? "theme-light" : "theme-dark"} />;
  const label = uiText(1619, [theme === "dark" ? "escuro" : "claro"]);

  return (
    <details
      className={
        variant === "nav" ? "appearance-picker appearance-picker--nav" : "appearance-picker"
      }
      ref={detailsRef}
    >
      {variant === "nav" ? (
        <summary className="mobile-nav__item" aria-label={label}>
          <span className="mobile-nav__icon">{icon}</span>
          <span>{uiText(125)}</span>
        </summary>
      ) : (
        <summary className="appearance-picker__trigger" aria-label={label}>
          {icon}
        </summary>
      )}
      <section className="appearance-picker__sheet" aria-label={uiText(126)}>
        <strong>{uiText(125)}</strong>
        <div className="appearance-picker__options">
          {OPTIONS.map((option) => (
            <button
              type="button"
              className={
                preference === option.value
                  ? "appearance-picker__option is-active"
                  : "appearance-picker__option"
              }
              aria-pressed={preference === option.value}
              onClick={(event) => {
                setThemePreference(option.value);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
              key={option.value}
            >
              <span className="appearance-picker__option-icons">
                {option.value !== "dark" && <NavigationIcon name="theme-light" />}
                {option.value !== "light" && <NavigationIcon name="theme-dark" />}
              </span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </section>
    </details>
  );
}
