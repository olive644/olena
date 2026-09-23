import { describe, expect, it } from "vitest";
import {
  MAX_NOTEBOOK_COLLAB_PARTICIPANTS,
  addNotebookCollabParticipant,
  applyNotebookCollabDocument,
  createNotebookCollabState,
  toPublicNotebookCollabState,
} from "./notebook-collab";

const document = {
  version: 1 as const,
  paper: "ruled" as const,
  strokes: [],
};

describe("notebook collaboration", () => {
  it("limits an active room to four people", () => {
    let state = createNotebookCollabState({
      code: "ABCDE",
      hostToken: "host",
      notebookId: "n",
      now: 1,
    });
    for (let index = 0; index < MAX_NOTEBOOK_COLLAB_PARTICIPANTS + 1; index += 1) {
      state = addNotebookCollabParticipant(
        state,
        {
          id: `p${index}`,
          displayName: `Pessoa ${index}`,
          token: `t${index}`,
          online: true,
          lastSeenAt: 1,
        },
        index + 1,
      );
    }
    expect(state.participants).toHaveLength(MAX_NOTEBOOK_COLLAB_PARTICIPANTS);
  });

  it("publishes a document update with the author's action", () => {
    let state = createNotebookCollabState({
      code: "ABCDE",
      hostToken: "host",
      notebookId: "n",
      now: 1,
    });
    state = addNotebookCollabParticipant(
      state,
      { id: "p1", displayName: "Alice", token: "t1", online: true, lastSeenAt: 1 },
      2,
    );
    state = applyNotebookCollabDocument(state, {
      participantId: "p1",
      document,
      label: "escreveu uma nota",
      now: 3,
    });
    const publicState = toPublicNotebookCollabState(state);
    expect(publicState.document).toEqual(document);
    expect(publicState.actions.at(-1)).toMatchObject({
      displayName: "Alice",
      label: "escreveu uma nota",
    });
    expect(publicState.participants[0]).not.toHaveProperty("token");
  });
});
