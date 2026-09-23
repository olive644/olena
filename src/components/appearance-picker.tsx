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
   Existe uma única instância global no cabeçalho, visível tanto no desktop
   quanto no celular. */
export function AppearanceToggle() {
  const { theme, preference, setThemePreference } = useTheme();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") detailsRef.current?.removeAttribute("open");
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  const icon = (
    <NavigationIcon name={theme === "dark" ? "theme-light" : "theme-dark"} paperVariant="claro" />
  );
  const label = `Aparência: tema ${theme === "dark" ? "escuro" : "claro"}. Toque para escolher.`;

  return (
    <details className="appearance-picker" ref={detailsRef}>
      <summary className="appearance-picker__trigger" aria-label={label}>
        {icon}
      </summary>
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
