import { isHandwritingDocument } from "../data/local-workspace.js";
import type { HandwritingDocument } from "./handwriting.js";
import {
  createLocalRoomCode,
  normalizeLocalRoomCode,
  sanitizeDisplayName,
  isValidLocalRoomCode,
} from "./local-room.js";

export const MAX_NOTEBOOK_COLLAB_PARTICIPANTS = 4;
export const NOTEBOOK_COLLAB_TTL_SECONDS = 60 * 60 * 8;
export const NOTEBOOK_COLLAB_PRESENCE_GRACE_MS = 45_000;
export const NOTEBOOK_COLLAB_ACTION_LIMIT = 12;

export type NotebookCollabParticipant = {
  id: string;
  displayName: string;
  online: boolean;
  lastSeenAt: number;
  token?: string;
};

export type NotebookCollabAction = {
  id: string;
  participantId: string;
  displayName: string;
  kind: "document" | "joined" | "left";
  at: number;
  label: string;
};

export type NotebookCollabState = {
  code: string;
  hostToken: string;
  notebookId: string;
  document?: HandwritingDocument;
  participants: NotebookCollabParticipant[];
  actions: NotebookCollabAction[];
  revision: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  createRequestId?: string;
  receipts?: Record<string, { participantId: string; participantToken: string }>;
};

export type PublicNotebookCollabState = Omit<NotebookCollabState, "hostToken" | "receipts"> & {
  participants: Omit<NotebookCollabParticipant, "token">[];
};

export function createNotebookCollabCode(random: () => number = Math.random): string {
  return createLocalRoomCode(random);
}

export function normalizeNotebookCollabCode(value: string): string {
  return normalizeLocalRoomCode(value);
}

export function isValidNotebookCollabCode(value: string): boolean {
  return isValidLocalRoomCode(value);
}

export function notebookCollabStorageKey(code: string): string {
  return `notebook-collab/${normalizeNotebookCollabCode(code)}`;
}

export function createNotebookCollabState(dependencies: {
  code: string;
  hostToken: string;
  notebookId: string;
  now: number;
}): NotebookCollabState {
  return {
    code: normalizeNotebookCollabCode(dependencies.code),
    hostToken: dependencies.hostToken,
    notebookId: dependencies.notebookId,
    participants: [],
    actions: [],
    revision: 0,
    createdAt: dependencies.now,
    updatedAt: dependencies.now,
    expiresAt: dependencies.now + NOTEBOOK_COLLAB_TTL_SECONDS * 1000,
  };
}

export function addNotebookCollabParticipant(
  state: NotebookCollabState,
  participant: NotebookCollabParticipant,
  now: number,
): NotebookCollabState {
  const active = state.participants.filter((item) => item.online !== false);
  if (active.length >= MAX_NOTEBOOK_COLLAB_PARTICIPANTS) return state;
  if (state.participants.some((item) => item.id === participant.id)) return state;
  return {
    ...state,
    participants: [...state.participants, participant],
    actions: [
      ...state.actions,
      {
        id: `joined-${participant.id}-${now}`,
        participantId: participant.id,
        displayName: participant.displayName,
        kind: "joined" as const,
        at: now,
        label: "entrou no caderno",
      },
    ].slice(-NOTEBOOK_COLLAB_ACTION_LIMIT),
    updatedAt: now,
  };
}

export function touchNotebookCollabParticipant(
  state: NotebookCollabState,
  participantId: string,
  now: number,
  online = true,
): NotebookCollabState {
  return {
    ...state,
    participants: state.participants.map((item) =>
      item.id === participantId ? { ...item, lastSeenAt: now, online } : item,
    ),
    updatedAt: now,
  };
}

export function applyNotebookCollabDocument(
  state: NotebookCollabState,
  dependencies: {
    participantId: string;
    document: HandwritingDocument;
    label?: string;
    now: number;
  },
): NotebookCollabState {
  const participant = state.participants.find((item) => item.id === dependencies.participantId);
  if (!participant || !isHandwritingDocument(dependencies.document)) return state;
  const action: NotebookCollabAction = {
    id: `document-${dependencies.participantId}-${dependencies.now}-${state.revision + 1}`,
    participantId: participant.id,
    displayName: participant.displayName,
    kind: "document",
    at: dependencies.now,
    label: dependencies.label?.trim().slice(0, 80) || "atualizou a folha",
  };
  return {
    ...state,
    document: dependencies.document,
    actions: [...state.actions, action].slice(-NOTEBOOK_COLLAB_ACTION_LIMIT),
    revision: state.revision + 1,
    updatedAt: dependencies.now,
  };
}

export function toPublicNotebookCollabState(state: NotebookCollabState): PublicNotebookCollabState {
  const participants = state.participants.map((participant) => {
    const copy = { ...participant };
    delete copy.token;
    return copy;
  });
  return {
    code: state.code,
    notebookId: state.notebookId,
    ...(state.document ? { document: state.document } : {}),
    participants,
    actions: state.actions,
    revision: state.revision,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    expiresAt: state.expiresAt,
  };
}

export function sanitizeNotebookCollabName(value: string): string {
  return sanitizeDisplayName(value);
}
