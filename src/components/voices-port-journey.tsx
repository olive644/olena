import { lastEnglishCheckpointPart } from "../data/english-checkpoint";
import { useEffect, useRef, useState } from "react";
import { readLastIsland, rememberEnteredIsland } from "../data/last-island";
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
    // A última parte aberta (ou a do checkpoint) vale se já estiver liberada.
    const opened = readLastIsland();
    const remembered =
      lastEnglishCheckpointPart() ?? (opened?.id === "english" ? opened.part : undefined);
    if (remembered !== undefined && (remembered === 0 || parts[remembered - 1]!.confirmed))
      return remembered;
    const pending = parts.findIndex((part) => !part.confirmed);
    return pending < 0 ? 5 : pending;
  });
  // Registra a entrada na ilha uma vez; a parte aberta é registrada em onSelect.
  const entered = useRef(false);
  useEffect(() => {
    if (entered.current) return;
    entered.current = true;
    rememberEnteredIsland("english", partIndex);
  }, [partIndex]);
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
        rememberEnteredIsland("english", part);
      }}
      onBack={onBack}
    />
  );
}
