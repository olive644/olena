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
  const [selectedPart, setSelectedPart] = useState<number>();
  const [partIndex, setPartIndex] = useState(() => {
    const pending = englishProgress(workspace.practiceActivities).parts.findIndex(
      (part) => !part.confirmed,
    );
    return pending < 0 ? 5 : pending;
  });
  return selectedPart !== undefined ? (
    <EnglishIslandJourney
      workspace={workspace}
      onPractice={onPractice}
      initialPart={selectedPart}
      onBack={() => setSelectedPart(undefined)}
    />
  ) : (
    <VoicesLanguageMap
      key="english-parts"
      initialPart={partIndex}
      progress={englishProgress(workspace.practiceActivities)}
      onSelect={(part) => {
        setPartIndex(part);
        setSelectedPart(part);
      }}
      onBack={onBack}
    />
  );
}
