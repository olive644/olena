import { lastEnglishCheckpointPart } from "../data/english-checkpoint";
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
  const [deliveryOrigin, setDeliveryOrigin] = useState<{
    x: number;
    y: number;
    size: number;
    id: string;
  }>();
  const [partIndex, setPartIndex] = useState(() => {
    const parts = englishProgress(workspace.practiceActivities).parts;
    const remembered = lastEnglishCheckpointPart();
    if (remembered !== undefined && (remembered === 0 || parts[remembered - 1]!.confirmed))
      return remembered;
    const pending = parts.findIndex((part) => !part.confirmed);
    return pending < 0 ? 5 : pending;
  });
  return selectedPart !== undefined ? (
    <EnglishIslandJourney
      workspace={workspace}
      onPractice={onPractice}
      initialPart={selectedPart}
      onBack={() => {
        setDeliveryOrigin(undefined);
        setSelectedPart(undefined);
      }}
      onChestReturn={(origin) => {
        setDeliveryOrigin(origin);
        setSelectedPart(undefined);
      }}
    />
  ) : (
    <VoicesLanguageMap
      key="english-parts"
      initialPart={partIndex}
      deliveryOrigin={deliveryOrigin}
      progress={englishProgress(workspace.practiceActivities)}
      onSelect={(part) => {
        setDeliveryOrigin(undefined);
        setPartIndex(part);
        setSelectedPart(part);
      }}
      onBack={onBack}
    />
  );
}
