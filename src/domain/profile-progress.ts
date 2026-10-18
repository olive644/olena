import { mergeXpLedgers } from "./xp-ledger";
export const ACCOUNT_PROFILE_KEY = "helena.profile.v1";
export function profileRecord(raw: string | null | undefined): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
export function mergeProfileProgress(
  selected: string | undefined,
  ...sources: (string | undefined)[]
): string | undefined {
  if (selected === undefined && sources.every((raw) => raw === undefined)) return;
  const result = profileRecord(selected);
  const profiles = [selected, ...sources].map(profileRecord);
  if (!profiles.some((profile) => profile["xpLedger"] || profile["studentResume"])) return selected;
  const xp = mergeXpLedgers(...profiles.map((profile) => JSON.stringify(profile["xpLedger"])));
  if (xp) result["xpLedger"] = JSON.parse(xp) as unknown;
  const resume: Record<string, unknown> = {};
  for (const profile of profiles) {
    const value = profile["studentResume"];
    if (!value || typeof value !== "object") continue;
    for (const [key, entry] of Object.entries(value)) {
      if (
        !["notebook", "focus"].includes(key) ||
        !entry ||
        typeof entry !== "object" ||
        !("at" in entry) ||
        typeof entry.at !== "number" ||
        !Number.isFinite(entry.at)
      )
        continue;
      const old = resume[key];
      if (
        !old ||
        typeof old !== "object" ||
        !("at" in old) ||
        typeof old.at !== "number" ||
        entry.at > old.at
      )
        resume[key] = entry;
    }
  }
  if (Object.keys(resume).length) result["studentResume"] = resume;
  return JSON.stringify(result);
}
