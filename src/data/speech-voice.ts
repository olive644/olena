import { uiText } from "../i18n/runtime.js";
export const SPEECH_RATE_OPTIONS = [
  { value: 0.72, label: uiText("Devagar") },
  { value: 0.86, label: uiText("Natural") },
  { value: 1, label: uiText("Rápida") },
] as const;

const PREMIUM_HINTS = [
  "natural",
  "ava",
  "andrew",
  "emma",
  "brian",
  "serena",
  "google us english",
  "google uk english",
  "samantha",
  "aria",
  "jenny",
  "guy",
  "zira",
  "david",
];

const FEMALE_HINTS = [
  "aria",
  "jenny",
  "ava",
  "emma",
  "samantha",
  "zira",
  "serena",
  "google us english",
];

export function isEnglishVoice(voice: Pick<SpeechSynthesisVoice, "lang">): boolean {
  return voice.lang.toLocaleLowerCase("en-US").startsWith("en");
}

export function voiceQualityScore(
  voice: Pick<SpeechSynthesisVoice, "default" | "lang" | "localService" | "name">,
): number {
  const name = voice.name.toLocaleLowerCase("en-US");
  const language = voice.lang.toLocaleLowerCase("en-US");
  let score = 0;
  if (language === "en-us") score += 30;
  else if (language.startsWith("en")) score += 18;
  if (voice.default) score += 8;
  if (voice.localService) score += 3;
  const hintIndex = PREMIUM_HINTS.findIndex((hint) => name.includes(hint));
  if (hintIndex >= 0) score += 50 - hintIndex;
  return score;
}

export function rankEnglishVoices(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .filter(isEnglishVoice)
    .slice()
    .sort((left, right) => voiceQualityScore(right) - voiceQualityScore(left));
}

export function findFemaleEnglishVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  return rankEnglishVoices(voices).find((voice) =>
    FEMALE_HINTS.some((hint) => voice.name.toLocaleLowerCase("en-US").includes(hint)),
  );
}

export function selectFallbackEnglishVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  return findFemaleEnglishVoice(voices) ?? rankEnglishVoices(voices)[0];
}

export function speakEnglish(
  text: string,
  options: {
    voice?: SpeechSynthesisVoice | undefined;
    rate: number;
    onUnavailable: () => void;
  },
): SpeechSynthesisUtterance | undefined {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    options.onUnavailable();
    return undefined;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.voice?.lang ?? "en-US";
  utterance.voice = options.voice ?? null;
  utterance.rate = options.rate;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onerror = () => options.onUnavailable();
  window.speechSynthesis.speak(utterance);
  return utterance;
}
