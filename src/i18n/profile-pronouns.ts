import { uiText } from "./runtime";

export const PROFILE_PRONOUN_PRESETS = ["Ela/dela", "Ele/dele", "Elu/delu"] as const;

// Traduz só as opções do aplicativo. Não altera o perfil nem texto personalizado.
export function profilePronounsLabel(value: string | undefined): string {
  if (!value) return "";
  return PROFILE_PRONOUN_PRESETS.some((preset) => preset === value) ? uiText(value) : value;
}
