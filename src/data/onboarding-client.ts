import {
  parseOnboardingConfiguration,
  type OnboardingAnswers,
} from "../domain/onboarding-configuration";
import type { OnboardingConfiguration } from "../domain/onboarding-configuration";
import { parseOnboardingAnswers } from "../domain/onboarding-configuration";

export function readStoredOnboardingConfiguration(
  raw: string | null,
): OnboardingConfiguration | null {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("answers" in parsed) ||
      !("configuration" in parsed)
    )
      return null;
    const answers = parseOnboardingAnswers(parsed.answers);
    return answers ? parseOnboardingConfiguration(parsed.configuration, answers) : null;
  } catch {
    return null;
  }
}

export function readPendingOnboardingConfiguration(
  raw: string | null,
  owner: string | null,
): OnboardingConfiguration | null {
  try {
    const record: unknown = raw ? JSON.parse(raw) : null;
    if (
      !owner ||
      !record ||
      typeof record !== "object" ||
      !("configurationOwner" in record) ||
      record.configurationOwner !== owner ||
      !("configurationPending" in record) ||
      record.configurationPending !== true ||
      !("completed" in record) ||
      record.completed !== true
    )
      return null;
    return readStoredOnboardingConfiguration(raw);
  } catch {
    return null;
  }
}

export async function requestOnboardingConfiguration(
  answers: OnboardingAnswers,
  signal: AbortSignal,
) {
  const response = await fetch("/api/olena?action=onboarding&version=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ answers }),
    signal,
  });
  if (!response.ok) throw new Error("onboarding unavailable");
  const result = parseOnboardingConfiguration(await response.json(), answers);
  if (!result) throw new Error("invalid onboarding response");
  return result;
}
