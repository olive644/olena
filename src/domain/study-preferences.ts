export const studyModalities = ["visual", "auditivo", "leitura-escrita", "pratico"] as const;
export type StudyModality = (typeof studyModalities)[number];

export type StudyPreferences = {
  dailyGoalMinutes?: number | undefined;
  initialSubjectName?: string | undefined;
  initialIslandId?: string | undefined;
  onboardingSetupId?: string | undefined;
  flashcardNewLimit?: number;
  modalities: StudyModality[];
  processing: "sequencial" | "global";
  rhythm: "focado" | "difuso";
  programming: "nenhum" | "python" | "javascript" | "python-javascript";
};

export const defaultStudyPreferences: StudyPreferences = {
  modalities: [],
  processing: "sequencial",
  rhythm: "focado",
  programming: "nenhum",
};

export function hasStudyModality(preferences: StudyPreferences, modality: StudyModality): boolean {
  return preferences.modalities.includes(modality);
}
