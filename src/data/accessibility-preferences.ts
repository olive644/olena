import { useEffect, useState, useSyncExternalStore } from "react";

export const ACCESSIBILITY_KEY = "olena:accessibility:v1";
export type AccessibilityPreferences = {
  reduceMotion: boolean;
  highlightSelections: boolean;
  soundEffects: boolean;
  haptics: boolean;
  /** Caderno em 3D: opção experimental, desligada por padrão (o 2D é o caderno de sempre). */
  notebook3dOptIn: boolean;
};
const defaults: AccessibilityPreferences = {
  reduceMotion: false,
  highlightSelections: false,
  soundEffects: true,
  haptics: true,
  notebook3dOptIn: false,
};
let current = defaults;
const listeners = new Set<() => void>();

function read(): AccessibilityPreferences {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(ACCESSIBILITY_KEY) ?? "null");
    if (data && typeof data === "object")
      return {
        reduceMotion: "reduceMotion" in data && data["reduceMotion"] === true,
        highlightSelections: "highlightSelections" in data && data["highlightSelections"] === true,
        soundEffects: !("soundEffects" in data) || data["soundEffects"] !== false,
        haptics: !("haptics" in data) || data["haptics"] !== false,
        notebook3dOptIn: "notebook3dOptIn" in data && data["notebook3dOptIn"] === true,
      };
  } catch {
    /* Preferências indisponíveis: mantém a configuração padrão. */
  }
  return defaults;
}

function apply() {
  document.documentElement.dataset["reduceMotion"] = String(current.reduceMotion);
  document.documentElement.dataset["highlightSelections"] = String(current.highlightSelections);
  listeners.forEach((listener) => listener());
}

export function initializeAccessibility() {
  current = read();
  apply();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== ACCESSIBILITY_KEY && event.key !== null) return;
    current = read();
    apply();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function updateAccessibility(update: Partial<AccessibilityPreferences>): boolean {
  const next = { ...current, ...update };
  try {
    localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  current = next;
  apply();
  return true;
}

export function useAccessibility() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => current,
    () => defaults,
  );
}

export function isMotionReduced() {
  return (
    current.reduceMotion ||
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)
  );
}

export function areSoundEffectsEnabled() {
  return current.soundEffects;
}

export function isNotebook3dPreferred() {
  return current.notebook3dOptIn;
}

export function areHapticsEnabled() {
  return current.haptics;
}

/** Movimento reduzido por escolha do app ou do sistema, acompanhando as duas mudanças. */
export function useMotionReduced(): boolean {
  const { reduceMotion } = useAccessibility();
  const [system, setSystem] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setSystem(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduceMotion || system;
}
