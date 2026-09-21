import { useEffect, useRef, useState } from "react";
import { SYNCED_STORAGE_APPLIED_EVENT, writeSyncedStorage } from "../data/synced-storage";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

export const THEME_STORAGE_KEY = "helenastudy.theme";

function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function readInitialPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage indisponível: cai para acompanhar o sistema abaixo.
  }
  return "system";
}

export function useTheme() {
  const remoteUpdate = useRef(false);
  const [preference, setPreference] = useState<ThemePreference>(readInitialPreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    function handleChange(event: MediaQueryListEvent) {
      setSystemDark(event.matches);
    }
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const theme: Theme = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (remoteUpdate.current) {
      remoteUpdate.current = false;
      return;
    }
    try {
      writeSyncedStorage(THEME_STORAGE_KEY, preference);
    } catch {
      // Preferência vale só para esta sessão se não der para salvar.
    }
  }, [theme, preference]);

  useEffect(() => {
    const refresh = () => {
      const next = readInitialPreference();
      setPreference((current) => {
        if (current === next) return current;
        remoteUpdate.current = true;
        return next;
      });
    };
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
    return () => window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
  }, []);

  function toggleTheme() {
    setPreference((current) => {
      const effective = current === "system" ? (systemDark ? "dark" : "light") : current;
      return effective === "dark" ? "light" : "dark";
    });
  }

  return { theme, preference, setThemePreference: setPreference, toggleTheme };
}
