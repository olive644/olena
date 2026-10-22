import { recognizeSocialLink } from "./profile-identity.js";

// Metadados visuais, nunca autorização de plano, recompensa ou XP.
export type SocialProfileDetails = {
  level: number;
  streaks: { pomodoro: number; timer: number; islands: number };
  socialLinks: string[];
  updatedAt?: number;
};

export function validSocialProfileDetails(value: unknown): value is SocialProfileDetails {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SocialProfileDetails>;
  return (
    Number.isSafeInteger(item.level) &&
    Number(item.level) >= 1 &&
    Number(item.level) <= 1_000_000 &&
    !!item.streaks &&
    typeof item.streaks === "object" &&
    ["pomodoro", "timer", "islands"].every((key) => {
      const count = item.streaks![key as keyof SocialProfileDetails["streaks"]];
      return Number.isSafeInteger(count) && count >= 0 && count <= 100_000;
    }) &&
    Array.isArray(item.socialLinks) &&
    item.socialLinks.length <= 5 &&
    item.socialLinks.every((link) => typeof link === "string" && !!recognizeSocialLink(link))
  );
}

// O Realtime Database omite listas vazias. Ausência de links não apaga nível ou streaks.
export function publicProfileDetails(value: unknown): SocialProfileDetails | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const normalized = { ...record, socialLinks: record["socialLinks"] ?? [] };
  return validSocialProfileDetails(normalized) ? normalized : undefined;
}
