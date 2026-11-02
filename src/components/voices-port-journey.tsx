import { useState } from "react";
import type { PracticeActivity, WorkspaceState } from "../domain/workspace";
import { englishProgress } from "../domain/language-progress";
import { EnglishIslandJourney } from "./english-island-journey";
import { VoicesLanguageMap } from "./voices-language-map";
export function VoicesPortJourney({
  workspace,
  onPractice,
  onBack,
}: {
  workspace: WorkspaceState;
  onPractice: (activity: PracticeActivity) => void;
  onBack: () => void;
}) {
  const [english, setEnglish] = useState(false);
  return english ? (
    <EnglishIslandJourney
      workspace={workspace}
      onPractice={onPractice}
      onBack={() => setEnglish(false)}
    />
  ) : (
    <VoicesLanguageMap
      progress={englishProgress(workspace.practiceActivities)}
      onSelect={() => setEnglish(true)}
      onBack={onBack}
    />
  );
}
