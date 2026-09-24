import { useCallback, useEffect, useRef, useState } from "react";
import { isHandwritingDocument } from "../data/local-workspace";
import { roomAppCheckToken } from "../data/room-app-check";
import {
  isValidNotebookCollabCode,
  normalizeNotebookCollabCode,
  sanitizeNotebookCollabName,
  type PublicNotebookCollabState,
} from "../domain/notebook-collab";
import type { HandwritingDocument } from "../domain/handwriting";
import { mergeHandwriting } from "../domain/merge-handwriting";

export type NotebookCollaborationStatus =
  "idle" | "connecting" | "online" | "reconnecting" | "offline" | "error";

export type NotebookCollaborationState = {
  code: string;
  participantId: string;
  displayName: string;
  room?: PublicNotebookCollabState;
  status: NotebookCollaborationStatus;
  error: string;
};

export const NOTEBOOK_COLLAB_SESSION_KEY = "helena:notebook-collab-session:v1";

type StoredSession = {
  code: string;
  credential: string;
  participantId: string;
  displayName: string;
};

type Options = {
  notebookId: string;
  onRemoteDocument?: (document: HandwritingDocument, author?: string) => void;
};

function readStoredSession(notebookId: string): StoredSession | undefined {
  try {
    const raw = sessionStorage.getItem(NOTEBOOK_COLLAB_SESSION_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Partial<StoredSession> & { notebookId?: string };
    if (
      value.notebookId !== notebookId ||
      typeof value.code !== "string" ||
      !isValidNotebookCollabCode(value.code) ||
      typeof value.credential !== "string" ||
      typeof value.participantId !== "string" ||
      typeof value.displayName !== "string"
    )
      return undefined;
    return {
      code: normalizeNotebookCollabCode(value.code),
      credential: value.credential,
      participantId: value.participantId,
      displayName: value.displayName,
    };
  } catch {
    return undefined;
  }
}

function writeStoredSession(notebookId: string, session: StoredSession) {
  try {
    sessionStorage.setItem(NOTEBOOK_COLLAB_SESSION_KEY, JSON.stringify({ notebookId, ...session }));
  } catch {
    // A colaboração continua disponível enquanto a aba estiver aberta.
  }
}

function clearStoredSession() {
  try {
    sessionStorage.removeItem(NOTEBOOK_COLLAB_SESSION_KEY);
  } catch {
    // Storage bloqueado não impede sair da sala.
  }
}

function normalizeState(value: unknown): PublicNotebookCollabState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<PublicNotebookCollabState>;
  if (
    typeof candidate.code !== "string" ||
    !isValidNotebookCollabCode(candidate.code) ||
    typeof candidate.notebookId !== "string" ||
    !Array.isArray(candidate.participants) ||
    !Array.isArray(candidate.actions) ||
    typeof candidate.revision !== "number"
  )
    return undefined;
  if (candidate.document !== undefined && !isHandwritingDocument(candidate.document))
    return undefined;
  return candidate as PublicNotebookCollabState;
}

async function request<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const appCheckToken = await roomAppCheckToken();
  const response = await fetch(`/api/notebook-collab?action=${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível conectar o caderno.");
  return payload;
}

export function useNotebookCollaboration({ notebookId, onRemoteDocument }: Options) {
  const [state, setState] = useState<NotebookCollaborationState>({
    code: "",
    participantId: "",
    displayName: "",
    status: "idle",
    error: "",
  });
  const sessionRef = useRef<StoredSession | undefined>(undefined);
  const streamRef = useRef<EventSource | undefined>(undefined);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastPublishedRef = useRef("");
  const revisionRef = useRef(-1);
  const baseDocumentRef = useRef<HandwritingDocument | undefined>(undefined);
  const pendingRef = useRef<{ document: HandwritingDocument; label?: string } | undefined>(
    undefined,
  );
  const publishingRef = useRef(false);
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);
  const onRemoteDocumentRef = useRef(onRemoteDocument);
  onRemoteDocumentRef.current = onRemoteDocument;

  const stop = useCallback((clear = false) => {
    streamRef.current?.close();
    streamRef.current = undefined;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = undefined;
    if (clear) clearStoredSession();
  }, []);

  const applyRoom = useCallback((room: PublicNotebookCollabState) => {
    if (room.revision < revisionRef.current) return;
    revisionRef.current = room.revision;
    setState((current) => {
      if (current.room && current.room.code === room.code && current.room.revision > room.revision)
        return current;
      return { ...current, code: room.code, room, status: "online", error: "" };
    });
    if (room.document) {
      if (JSON.stringify(pendingRef.current?.document) === JSON.stringify(room.document))
        pendingRef.current = undefined;
      const pending = pendingRef.current;
      const next =
        pending && baseDocumentRef.current
          ? mergeHandwriting(baseDocumentRef.current, pending.document, room.document)
          : room.document;
      baseDocumentRef.current = room.document;
      if (pending) pendingRef.current = { ...pending, document: next };
      const serialized = JSON.stringify(next);
      if (serialized !== lastPublishedRef.current) {
        lastPublishedRef.current = serialized;
        const author = room.actions.at(-1)?.displayName;
        onRemoteDocumentRef.current?.(next, author);
      }
    }
  }, []);

  const startStream = useCallback(
    (streamUrl: string) => {
      streamRef.current?.close();
      const source = new EventSource(streamUrl);
      source.onopen = () => setState((current) => ({ ...current, status: "online" }));
      source.onerror = () =>
        setState((current) => ({
          ...current,
          status: navigator.onLine ? "reconnecting" : "offline",
        }));
      source.addEventListener("put", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent<string>).data) as {
            path: string;
            data: unknown;
          };
          if (payload.path === "/" && payload.data) {
            const room = normalizeState(payload.data);
            if (room) applyRoom(room);
          }
        } catch {
          // Aguarda o próximo evento.
        }
      });
      streamRef.current = source;
    },
    [applyRoom],
  );

  const connect = useCallback(
    async (
      session: StoredSession,
      action: "resume" | "join" | "create",
      body: Record<string, unknown>,
    ) => {
      setState((current) => ({ ...current, status: "connecting", error: "" }));
      try {
        const payload = await request<{
          state: PublicNotebookCollabState;
          streamUrl: string;
          participantId?: string;
          participantToken?: string;
          hostToken?: string;
        }>(action, body);
        const credential = payload.participantToken ?? payload.hostToken ?? session.credential;
        const participantId = payload.participantId ?? session.participantId;
        const nextSession = { ...session, code: payload.state.code, credential, participantId };
        revisionRef.current = payload.state.revision;
        baseDocumentRef.current = payload.state.document;
        sessionRef.current = nextSession;
        writeStoredSession(notebookId, nextSession);
        setState({
          code: payload.state.code,
          participantId,
          displayName: nextSession.displayName,
          room: payload.state,
          status: "online",
          error: "",
        });
        lastPublishedRef.current = payload.state.document
          ? JSON.stringify(payload.state.document)
          : "";
        if (payload.state.document) onRemoteDocumentRef.current?.(payload.state.document);
        startStream(payload.streamUrl);
        return true;
      } catch (caught) {
        if (mountedRef.current)
          setState((current) => ({
            ...current,
            status: "error",
            error: caught instanceof Error ? caught.message : "Não foi possível conectar.",
          }));
        return false;
      }
    },
    [notebookId, startStream],
  );

  const create = useCallback(
    async (displayName: string, initialDocument?: HandwritingDocument) => {
      const name = sanitizeNotebookCollabName(displayName);
      if (!name) {
        setState((current) => ({
          ...current,
          status: "error",
          error: "Informe seu nome para compartilhar.",
        }));
        return false;
      }
      const session: StoredSession = {
        code: "",
        credential: "",
        participantId: "",
        displayName: name,
      };
      return connect(session, "create", {
        notebookId,
        displayName: name,
        requestId: crypto.randomUUID(),
        ...(initialDocument ? { document: initialDocument } : {}),
      });
    },
    [connect, notebookId],
  );

  const join = useCallback(
    async (code: string, displayName: string) => {
      const normalized = normalizeNotebookCollabCode(code);
      const name = sanitizeNotebookCollabName(displayName);
      if (!isValidNotebookCollabCode(normalized) || !name) {
        setState((current) => ({
          ...current,
          status: "error",
          error: "Informe o código e seu nome.",
        }));
        return false;
      }
      return connect(
        { code: normalized, credential: "", participantId: "", displayName: name },
        "join",
        { code: normalized, displayName: name, requestId: crypto.randomUUID() },
      );
    },
    [connect],
  );

  const publish = useCallback(
    async (document: HandwritingDocument, label?: string) => {
      const session = sessionRef.current;
      if (!session || JSON.stringify(document) === lastPublishedRef.current) return;
      pendingRef.current = { document, ...(label ? { label } : {}) };
      if (publishingRef.current) return;
      publishingRef.current = true;
      try {
        while (pendingRef.current && sessionRef.current === session) {
          const pending: { document: HandwritingDocument; label?: string } = pendingRef.current;
          const payload = await request<{ state: PublicNotebookCollabState }>("update", {
            code: session.code,
            credential: session.credential,
            document: pending.document,
            ...(baseDocumentRef.current ? { baseDocument: baseDocumentRef.current } : {}),
            ...(pending.label ? { label: pending.label } : {}),
          });
          if (sessionRef.current !== session) break;
          if (pendingRef.current === pending) pendingRef.current = undefined;
          applyRoom(payload.state);
        }
      } catch (caught) {
        if (mountedRef.current)
          setState((current) => ({
            ...current,
            status: "error",
            error:
              caught instanceof Error
                ? caught.message
                : "Não foi possível compartilhar a alteração.",
          }));
      } finally {
        publishingRef.current = false;
      }
    },
    [applyRoom],
  );

  const publishDebounced = useCallback(
    (document: HandwritingDocument, label?: string) => {
      if (!sessionRef.current || JSON.stringify(document) === lastPublishedRef.current) return;
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      pendingRef.current = { document, ...(label ? { label } : {}) };
      updateTimerRef.current = setTimeout(() => {
        const pending = pendingRef.current;
        if (pending) {
          lastPublishedRef.current = "";
          void publish(pending.document, pending.label);
        }
      }, 350);
    },
    [publish],
  );

  const leave = useCallback(async () => {
    const session = sessionRef.current;
    if (session) {
      await request("leave", { code: session.code, credential: session.credential }).catch(
        () => {},
      );
    }
    sessionRef.current = undefined;
    pendingRef.current = undefined;
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    stop(true);
    setState({ code: "", participantId: "", displayName: "", status: "idle", error: "" });
  }, [stop]);

  useEffect(() => {
    mountedRef.current = true;
    const stored = readStoredSession(notebookId);
    if (stored) {
      sessionRef.current = stored;
      void connect(stored, "resume", { code: stored.code, credential: stored.credential });
    }
    return () => {
      mountedRef.current = false;
      sessionRef.current = undefined;
      pendingRef.current = undefined;
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      stop();
    };
  }, [connect, notebookId, stop]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session || state.status === "idle") return;
    const beat = () =>
      void request<{ state: PublicNotebookCollabState }>("heartbeat", {
        code: session.code,
        credential: session.credential,
      })
        .then((payload) => {
          const pending = pendingRef.current;
          applyRoom(payload.state);
          if (pending) {
            lastPublishedRef.current = "";
            void publish(pendingRef.current?.document ?? pending.document, pending.label);
          }
        })
        .catch(() => {
          setState((current) => ({ ...current, status: "offline" }));
        });
    heartbeatRef.current = setInterval(beat, 15_000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = undefined;
    };
  }, [state.status, state.code, applyRoom, publish]);

  return { state, create, join, publish: publishDebounced, leave };
}
