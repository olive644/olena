import { areHapticsEnabled } from "./accessibility-preferences";
type Interaction = { target: EventTarget | null; isTrusted: boolean };

export function settingsPulse() {
  try {
    if (
      areHapticsEnabled() &&
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    )
      navigator.vibrate(8);
  } catch {
    // Navegador sem suporte ou bloqueio do sistema não pode interromper a ação.
  }
}

export function initializeAppHaptics() {
  document.addEventListener("click", settingsClickHaptic, true);
  document.addEventListener("change", settingsChangeHaptic, true);
  return () => {
    document.removeEventListener("click", settingsClickHaptic, true);
    document.removeEventListener("change", settingsChangeHaptic, true);
  };
}

function controlFor(event: Interaction): Element | null {
  if (!event.isTrusted || !(event.target instanceof Element)) return null;
  const control = event.target.closest("button,a[href],input,select,summary");
  if (
    !control ||
    control.matches(":disabled,[aria-disabled='true']") ||
    control.closest("[hidden],[inert],[data-settings-haptic-handled]")
  )
    return null;
  return control;
}

export function settingsClickHaptic(event: Interaction) {
  const control = controlFor(event);
  if (control?.matches("button,a[href],summary,input[type='button'],input[type='submit']"))
    settingsPulse();
}

export function settingsChangeHaptic(event: Interaction) {
  const control = controlFor(event);
  if (control?.matches("select,input[type='checkbox'],input[type='radio'],input[type='range']"))
    settingsPulse();
}
