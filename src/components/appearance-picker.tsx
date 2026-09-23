import { useEffect, useRef } from "react";
import { useTheme, type ThemePreference } from "../hooks/use-theme";
import { NavigationIcon } from "./navigation-icon";

const OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
];

/* Botão único de aparência: mostra o ícone do tema oposto ao ativo (convite
   para trocar) e abre a folha de papel com as três opções de aparência.
   "header" é o botão quadrado isolado do cabeçalho (desktop); "nav" imita um
   item comum da barra inferior móvel, com rótulo abaixo do ícone. */
export function AppearanceToggle({ variant = "header" }: { variant?: "header" | "nav" }) {
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
  const label = `Aparência: tema ${theme === "dark" ? "escuro" : "claro"}. Toque para escolher.`;

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
          <span>Aparência</span>
        </summary>
      ) : (
        <summary className="appearance-picker__trigger" aria-label={label}>
          {icon}
        </summary>
      )}
      <section className="appearance-picker__sheet" aria-label="Escolher aparência">
        <strong>Aparência</strong>
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
