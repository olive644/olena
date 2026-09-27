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
  accountId?: string;
  avatarUrl?: string | undefined;
  online: boolean;
  lastSeenAt: number;
  token?: string;
};

export function sanitizeNotebookCollabAvatar(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return /^\/profile-avatars\/[a-z0-9-]+\.(?:svg|webp)$/.test(value) ? value : undefined;
}

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
  pages?: NotebookCollabPage[];
  title?: string;
  participants: NotebookCollabParticipant[];
  actions: NotebookCollabAction[];
  revision: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  createRequestId?: string;
  receipts?: Record<string, { participantId: string; participantToken: string }>;
};
export type NotebookCollabPage = { id: string; title: string; document?: HandwritingDocument };

// O índice compartilha títulos e ordem. A tinta tem seu próprio canal de merge.
export function mergeNotebookPages(
  before: NotebookCollabPage[],
  local: NotebookCollabPage[],
  latest: NotebookCollabPage[],
): NotebookCollabPage[] {
  const removed = new Set(before.filter((p) => !local.some((q) => q.id === p.id)).map((p) => p.id));
  const next = local
    .filter((p) => !before.some((b) => b.id === p.id) || latest.some((r) => r.id === p.id))
    .map((p) => {
      const remote = latest.find((r) => r.id === p.id);
      const base = before.find((b) => b.id === p.id);
      return remote ? { ...remote, title: base?.title !== p.title ? p.title : remote.title } : p;
    });
  for (const page of latest)
    if (!removed.has(page.id) && !next.some((p) => p.id === page.id)) next.push(page);
  if (before.map((p) => p.id).join("\u0000") === local.map((p) => p.id).join("\u0000")) {
    const order = new Map(latest.map((p, i) => [p.id, i]));
    next.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
  }
  return next;
}
export function isNotebookCollabPages(value: unknown): value is NotebookCollabPage[] {
  return (
    Array.isArray(value) &&
    value.length <= 200 &&
    new Set(
      value.map((item: unknown) =>
        item && typeof item === "object" ? (item as { id?: unknown }).id : undefined,
      ),
    ).size === value.length &&
    value.every((item: unknown) => {
      if (!item || typeof item !== "object") return false;
      const p = item as Record<string, unknown>;
      return (
        typeof p["id"] === "string" &&
        p["id"].length > 0 &&
        p["id"].length <= 120 &&
        typeof p["title"] === "string" &&
        p["title"].length <= 120 &&
        (p["document"] === undefined || isHandwritingDocument(p["document"]))
      );
    })
  );
}

// Posição do cursor de quem está escrevendo, em unidades da folha. Vale por poucos segundos: quem
// lê ignora entradas antigas, então nada precisa ser apagado.
export type NotebookCollabCursor = { x: number; y: number; at: number; pageId?: string };
export const NOTEBOOK_COLLAB_CURSOR_MAX = 4000;
export const NOTEBOOK_COLLAB_CURSOR_TTL_MS = 5_000;

export function sanitizeNotebookCollabCursor(
  body: Record<string, unknown>,
  now: number,
): NotebookCollabCursor | null {
  const { x, y } = body;
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y))
    return null;
  const clamp = (value: number) => Math.max(0, Math.min(NOTEBOOK_COLLAB_CURSOR_MAX, value));
  return {
    x: Math.round(clamp(x)),
    y: Math.round(clamp(y)),
    at: now,
    ...(typeof body["pageId"] === "string" && body["pageId"].length <= 120
      ? { pageId: body["pageId"] }
      : {}),
  };
}

export type PublicNotebookCollabState = Omit<NotebookCollabState, "hostToken" | "receipts"> & {
  participants: Omit<NotebookCollabParticipant, "token" | "accountId">[];
  // Escrito à parte, por um canal leve, sem passar pela folha: ver publishCursor.
  cursors?: Record<string, NotebookCollabCursor>;
};

export function createNotebookCollabCode(random?: () => number): string {
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
  profile?: { displayName: string; avatarUrl?: string | undefined },
): NotebookCollabState {
  return {
    ...state,
    participants: state.participants.map((item) =>
      item.id === participantId
        ? {
            ...item,
            lastSeenAt: now,
            online,
            ...(profile ? { displayName: profile.displayName, avatarUrl: profile.avatarUrl } : {}),
          }
        : item,
    ),
    updatedAt: now,
  };
}

export function applyNotebookCollabDocument(
  state: NotebookCollabState,
  dependencies: {
    participantId: string;
    document: HandwritingDocument;
    pageId?: string;
    label?: string;
    now: number;
  },
): NotebookCollabState {
  const participant = state.participants.find((item) => item.id === dependencies.participantId);
  if (!participant || !isHandwritingDocument(dependencies.document)) return state;
  const page = state.pages?.find((item) => item.id === dependencies.pageId);
  if (state.pages && !page) return state;
  if (
    JSON.stringify(state.pages ? page?.document : state.document) ===
    JSON.stringify(dependencies.document)
  )
    return state;
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
    ...(state.pages
      ? {
          pages: state.pages.map((item) =>
            item.id === dependencies.pageId ? { ...item, document: dependencies.document } : item,
          ),
        }
      : {}),
    actions: [...state.actions, action].slice(-NOTEBOOK_COLLAB_ACTION_LIMIT),
    revision: state.revision + 1,
    updatedAt: dependencies.now,
  };
}

export function toPublicNotebookCollabState(state: NotebookCollabState): PublicNotebookCollabState {
  const participants = state.participants.map((participant) => {
    const copy = { ...participant };
    delete copy.token;
    delete copy.accountId;
    return copy;
  });
  return {
    code: state.code,
    notebookId: state.notebookId,
    ...(state.document ? { document: state.document } : {}),
    ...(state.pages ? { pages: state.pages } : {}),
    ...(state.title ? { title: state.title } : {}),
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
