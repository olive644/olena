import { ENGLISH_PART_ORDER, englishPartUnlocked } from "../domain/english-part-order";
import { lastEnglishCheckpointPart } from "../data/english-checkpoint";
import { useEffect, useRef, useState } from "react";
import { readLastIsland, rememberEnteredIsland } from "../data/last-island";
import type { PracticeActivity, WorkspaceState } from "../domain/workspace";
import { useEnglishProgress } from "../hooks/use-english-progress";
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
  const english = useEnglishProgress(workspace.practiceActivities);
  const [partIndex, setPartIndex] = useState(() => {
    const parts = english.parts;
    // A última parte aberta (ou a do checkpoint) vale se já estiver liberada.
    const opened = readLastIsland();
    const remembered =
      lastEnglishCheckpointPart() ?? (opened?.id === "english" ? opened.part : undefined);
    if (remembered !== undefined && englishPartUnlocked(parts, remembered)) return remembered;
    return ENGLISH_PART_ORDER.find((id) => !parts[id]!.confirmed) ?? 5;
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
      progress={english}
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
