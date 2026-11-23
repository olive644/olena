import { type Dispatch, useMemo } from "react";
import type { WorkspaceAction, WorkspaceState } from "../domain/workspace";
import { EssayWriting } from "./typewriter-desk";
import { EnemEssayPrompt } from "./enem-essay-prompt";
import "./enem-essay-writing.css";

export type EnemEssaySubmission = {
  text: string;
  elapsedSeconds: number;
};

export function EnemEssayWriting({
  year,
  paperUrl,
  variantId,
  scope,
  workspace,
  collectionId,
  dispatch,
  onClose,
  onSubmit,
}: {
  year: number;
  paperUrl: string;
  variantId: string;
  scope: string;
  workspace: WorkspaceState;
  collectionId: string;
  dispatch: Dispatch<WorkspaceAction>;
  onClose(): void;
  onSubmit(submission: EnemEssaySubmission): void;
}) {
  const proposal = useMemo(
    () => ({
      id: `enem-essay:${year}:${variantId}`,
      title: `Redação do Enem ${year}`,
      category: "Enem",
    }),
    [year, variantId],
  );
  return (
    <div className="enem-essay-writing">
      <EssayWriting
        key={`${scope}:${proposal.id}`}
        workspace={workspace}
        collectionId={collectionId}
        dispatch={dispatch}
        proposal={proposal}
        proposalContent={<EnemEssayPrompt key={paperUrl} year={year} paperUrl={paperUrl} />}
        onBack={onClose}
        onSubmit={onSubmit}
      />
    </div>
  );
}
