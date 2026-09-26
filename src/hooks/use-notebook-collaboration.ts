import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isHandwritingDocument } from "../data/local-workspace";
import { roomAppCheckToken } from "../data/room-app-check";
import { getFirebaseAccountServices } from "../data/firebase-account";
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

// Alterações ainda não enviadas ficam guardadas neste aparelho, para sobreviver a uma recarga ou
// ao fechamento da aba sem conexão. `base` é a última folha do servidor a partir da qual elas
// foram feitas: é o que permite juntar com o que os colegas escreveram nesse meio tempo.
export const NOTEBOOK_COLLAB_PENDING_KEY = "helena.notebook-collab.pending.v1";

type StoredPending = {
  code: string;
  document: HandwritingDocument;
  base?: HandwritingDocument;
  label?: string;
};

function readStoredPending(code: string): StoredPending | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(NOTEBOOK_COLLAB_PENDING_KEY) ?? "null") as {
      code?: unknown;
      document?: unknown;
      base?: unknown;
      label?: unknown;
    } | null;
    if (!value || value.code !== code || !isHandwritingDocument(value.document)) return undefined;
    return {
      code,
      document: value.document as HandwritingDocument,
      ...(isHandwritingDocument(value.base) ? { base: value.base as HandwritingDocument } : {}),
      ...(typeof value.label === "string" ? { label: value.label } : {}),
    };
  } catch {
    return undefined;
  }
}

function writeStoredPending(pending: StoredPending | undefined) {
  try {
    if (pending) localStorage.setItem(NOTEBOOK_COLLAB_PENDING_KEY, JSON.stringify(pending));
    else localStorage.removeItem(NOTEBOOK_COLLAB_PENDING_KEY);
  } catch {
    // Sem espaço, as alterações continuam só na memória, como antes.
  }
}

// Falha de rede ou do servidor: vale tentar de novo. Recusas (403, 404...) não.
class CollabRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function isTransient(caught: unknown): boolean {
  return (
    caught instanceof TypeError ||
    (caught instanceof CollabRequestError && caught.status >= 500) ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  );
}

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
  const accountToken = await getFirebaseAccountServices()
    .then(({ auth }) => auth.currentUser?.getIdToken())
    .catch(() => undefined);
  const response = await fetch(`/api/notebook-collab?action=${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
      ...(accountToken ? { Authorization: `Bearer ${accountToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok)
    throw new CollabRequestError(
      payload.error ?? "Não foi possível conectar o caderno.",
      response.status,
    );
  return payload;
}

// Cursor dos colegas. Quem lê usa a hora em que a posição chegou, não a do servidor, para relógios
// desencontrados não esconderem nem eternizarem um cursor.
export type RemoteCursor = {
  participantId: string;
  displayName: string;
  avatarUrl?: string | undefined;
  x: number;
  y: number;
};

const CURSOR_SEND_INTERVAL_MS = 250;
const CURSOR_STALE_MS = 5_000;

function readCursorPoint(value: unknown): { x: number; y: number } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { x, y } = value as { x?: unknown; y?: unknown };
  return typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y)
    ? { x, y }
    : undefined;
}

// Espera curta para juntar traços seguidos em um só envio: o colega vê o traço
// quase assim que a caneta é solta, sem uma escrita por ponto.
const PUBLISH_DEBOUNCE_MS = 140;

export function useNotebookCollaboration({ notebookId, onRemoteDocument }: Options) {
  const [state, setState] = useState<NotebookCollaborationState>({
    code: "",
    participantId: "",
    displayName: "",
    status: "idle",
    error: "",
  });
  const [activity, setActivity] = useState("");
  const lastActionIdRef = useRef("");
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
  const [hasPending, setHasPending] = useState(false);
  const publishRef = useRef<
    ((document: HandwritingDocument, label?: string) => Promise<void>) | undefined
  >(undefined);
  const codeRef = useRef("");
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);
  const cursorSeenRef = useRef(new Map<string, { x: number; y: number; seenAt: number }>());
  const [cursorTick, setCursorTick] = useState(0);
  const cursorSentAtRef = useRef(0);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cursorBusyRef = useRef(false);
  const cursorPendingRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const onRemoteDocumentRef = useRef(onRemoteDocument);
  onRemoteDocumentRef.current = onRemoteDocument;

  // Toda mudança da fila passa por aqui: memória, aparelho e o aviso da tela ficam juntos.
  const setPending = useCallback(
    (next: { document: HandwritingDocument; label?: string } | undefined) => {
      pendingRef.current = next;
      setHasPending(next !== undefined);
      const code = codeRef.current;
      if (!code) return;
      writeStoredPending(
        next
          ? {
              code,
              document: next.document,
              ...(baseDocumentRef.current ? { base: baseDocumentRef.current } : {}),
              ...(next.label ? { label: next.label } : {}),
            }
          : undefined,
      );
    },
    [],
  );

  const stop = useCallback((clear = false) => {
    streamRef.current?.close();
    streamRef.current = undefined;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = undefined;
    clearTimeout(activityTimerRef.current);
    clearTimeout(cursorTimerRef.current);
    cursorTimerRef.current = undefined;
    cursorPendingRef.current = undefined;
    cursorSeenRef.current.clear();
    if (clear) clearStoredSession();
  }, []);

  const applyRoom = useCallback(
    (room: PublicNotebookCollabState) => {
      if (room.revision < revisionRef.current) return;
      const session = sessionRef.current;
      if (!session || session.code !== room.code) return;
      if (
        session &&
        !room.participants.some((participant) => participant.id === session.participantId)
      ) {
        sessionRef.current = undefined;
        setPending(undefined);
        clearTimeout(updateTimerRef.current);
        clearTimeout(activityTimerRef.current);
        streamRef.current?.close();
        clearInterval(heartbeatRef.current);
        clearStoredSession();
        setActivity("");
        setState({
          code: "",
          participantId: "",
          displayName: "",
          status: "idle",
          error: "Você saiu desta colaboração.",
        });
        return;
      }
      const action = room.actions.at(-1);
      if (action && action.id !== lastActionIdRef.current) {
        lastActionIdRef.current = action.id;
        if (
          action.kind === "document" &&
          action.participantId !== sessionRef.current?.participantId
        ) {
          setActivity(`${action.displayName} ${action.label}`);
          clearTimeout(activityTimerRef.current);
          activityTimerRef.current = setTimeout(() => setActivity(""), 4000);
        }
      }
      revisionRef.current = room.revision;
      setState((current) => {
        if (
          current.room &&
          current.room.code === room.code &&
          current.room.revision > room.revision
        )
          return current;
        return { ...current, code: room.code, room, status: "online", error: "" };
      });
      if (room.document) {
        if (JSON.stringify(pendingRef.current?.document) === JSON.stringify(room.document))
          setPending(undefined);
        const pending = pendingRef.current;
        const next =
          pending && baseDocumentRef.current
            ? mergeHandwriting(baseDocumentRef.current, pending.document, room.document)
            : room.document;
        baseDocumentRef.current = room.document;
        if (pending) setPending({ ...pending, document: next });
        const serialized = JSON.stringify(next);
        if (serialized !== lastPublishedRef.current) {
          lastPublishedRef.current = serialized;
          const author =
            room.actions.at(-1)?.kind === "document" ? room.actions.at(-1)?.displayName : undefined;
          onRemoteDocumentRef.current?.(next, author);
        }
      }
    },
    [setPending],
  );

  const receiveCursor = useCallback((id: string, value: unknown) => {
    const point = readCursorPoint(value);
    if (point) cursorSeenRef.current.set(id, { ...point, seenAt: performance.now() });
    else cursorSeenRef.current.delete(id);
  }, []);

  // O Firebase manda mudanças de filhos como "put" ou "patch" com o caminho relativo à sala.
  const receiveCursorEvent = useCallback(
    (path: string, data: unknown, kind: "put" | "patch") => {
      const rest = path.replace(/^\/cursors\/?/, "");
      if (rest) {
        receiveCursor(rest.split("/")[0]!, rest.includes("/") ? undefined : data);
      } else {
        if (kind === "put") cursorSeenRef.current.clear();
        if (data && typeof data === "object") {
          for (const [id, value] of Object.entries(data)) receiveCursor(id, value);
        }
      }
      setCursorTick((tick) => tick + 1);
    },
    [receiveCursor],
  );

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
            const all = (payload.data as { cursors?: unknown }).cursors;
            cursorSeenRef.current.clear();
            if (all && typeof all === "object") {
              for (const [id, value] of Object.entries(all)) receiveCursor(id, value);
            }
            setCursorTick((tick) => tick + 1);
          } else if (payload.path.startsWith("/cursors")) {
            receiveCursorEvent(payload.path, payload.data, "put");
          }
        } catch {
          // Aguarda o próximo evento.
        }
      });
      source.addEventListener("patch", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent<string>).data) as {
            path: string;
            data: unknown;
          };
          if (payload.path.startsWith("/cursors"))
            receiveCursorEvent(payload.path, payload.data, "patch");
        } catch {
          // Aguarda o próximo evento.
        }
      });
      streamRef.current = source;
    },
    [applyRoom, receiveCursor, receiveCursorEvent],
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
        lastActionIdRef.current = payload.state.actions.at(-1)?.id ?? "";
        baseDocumentRef.current = payload.state.document;
        codeRef.current = payload.state.code;
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
        const saved = readStoredPending(payload.state.code);
        if (saved) {
          // Alterações feitas sem conexão: juntam com o que os colegas escreveram desde então.
          const restored =
            saved.base && payload.state.document
              ? mergeHandwriting(saved.base, saved.document, payload.state.document)
              : saved.document;
          setPending({ document: restored, ...(saved.label ? { label: saved.label } : {}) });
          lastPublishedRef.current = "";
          onRemoteDocumentRef.current?.(restored);
          startStream(payload.streamUrl);
          void publishRef.current?.(restored, saved.label);
          return true;
        }
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
    [notebookId, setPending, startStream],
  );

  const create = useCallback(
    async (displayName: string, initialDocument?: HandwritingDocument, avatarUrl?: string) => {
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
        avatarUrl,
        requestId: crypto.randomUUID(),
        ...(initialDocument ? { document: initialDocument } : {}),
      });
    },
    [connect, notebookId],
  );

  const join = useCallback(
    async (code: string, displayName: string, avatarUrl?: string) => {
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
        { code: normalized, displayName: name, avatarUrl, requestId: crypto.randomUUID() },
      );
    },
    [connect],
  );

  const publish = useCallback(
    async (document: HandwritingDocument, label?: string) => {
      const session = sessionRef.current;
      if (!session || JSON.stringify(document) === lastPublishedRef.current) return;
      setPending({ document, ...(label ? { label } : {}) });
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
          if (pendingRef.current === pending) setPending(undefined);
          applyRoom(payload.state);
        }
      } catch (caught) {
        if (mountedRef.current) {
          // Sem conexão a alteração não se perde: fica na fila (e no aparelho) e sai quando voltar.
          if (isTransient(caught)) setState((current) => ({ ...current, status: "offline" }));
          else
            setState((current) => ({
              ...current,
              status: "error",
              error:
                caught instanceof Error
                  ? caught.message
                  : "Não foi possível compartilhar a alteração.",
            }));
        }
      } finally {
        publishingRef.current = false;
      }
    },
    [applyRoom, setPending],
  );
  publishRef.current = publish;

  const publishDebounced = useCallback(
    (document: HandwritingDocument, label?: string) => {
      if (!sessionRef.current || JSON.stringify(document) === lastPublishedRef.current) return;
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      setPending({ document, ...(label ? { label } : {}) });
      updateTimerRef.current = setTimeout(() => {
        const pending = pendingRef.current;
        if (pending) {
          lastPublishedRef.current = "";
          void publish(pending.document, pending.label);
        }
      }, PUBLISH_DEBOUNCE_MS);
    },
    [publish, setPending],
  );

  const flushCursor = useCallback(() => {
    const session = sessionRef.current;
    const point = cursorPendingRef.current;
    if (!session || !point || cursorBusyRef.current) return;
    cursorPendingRef.current = undefined;
    cursorBusyRef.current = true;
    cursorSentAtRef.current = performance.now();
    void request("cursor", {
      code: session.code,
      credential: session.credential,
      x: point.x,
      y: point.y,
    })
      .catch(() => undefined)
      .finally(() => {
        cursorBusyRef.current = false;
      });
  }, []);

  // Posição do cursor em unidades da folha. Só é enviada com alguém mais na folha, no máximo
  // quatro vezes por segundo e sem empilhar pedidos: a última posição vence.
  const sendCursor = useCallback(
    (x: number, y: number) => {
      const session = sessionRef.current;
      if (!session || state.status !== "online") return;
      const others = (state.room?.participants ?? []).filter(
        (item) => item.online !== false && item.id !== session.participantId,
      );
      if (others.length === 0) return;
      cursorPendingRef.current = { x, y };
      const wait = CURSOR_SEND_INTERVAL_MS - (performance.now() - cursorSentAtRef.current);
      if (wait <= 0) flushCursor();
      else if (!cursorTimerRef.current) {
        cursorTimerRef.current = setTimeout(() => {
          cursorTimerRef.current = undefined;
          flushCursor();
        }, wait);
      }
    },
    [flushCursor, state.room, state.status],
  );

  const leave = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = undefined;
    setPending(undefined);
    codeRef.current = "";
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    stop(true);
    setState({ code: "", participantId: "", displayName: "", status: "idle", error: "" });
    setActivity("");
    if (session)
      void request("leave", { code: session.code, credential: session.credential }).catch(() => {
        // A presença expira no servidor mesmo se a confirmação de saída falhar.
      });
  }, [setPending, stop]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = performance.now();
      let changed = false;
      for (const [id, seen] of cursorSeenRef.current) {
        if (now - seen.seenAt > CURSOR_STALE_MS) {
          cursorSeenRef.current.delete(id);
          changed = true;
        }
      }
      if (changed) setCursorTick((tick) => tick + 1);
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

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
      // A fila guardada no aparelho continua; só a cópia em memória some.
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
        avatarUrl: (() => {
          try {
            return (
              JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}") as { photoUrl?: string }
            ).photoUrl;
          } catch {
            return undefined;
          }
        })(),
      })
        .then((payload) => {
          if (sessionRef.current !== session) return;
          const pending = pendingRef.current;
          applyRoom(payload.state);
          if (pending) {
            lastPublishedRef.current = "";
            void publish(pendingRef.current?.document ?? pending.document, pending.label);
          }
        })
        .catch(() => {
          if (sessionRef.current !== session) return;
          setState((current) => ({ ...current, status: "offline" }));
        });
    heartbeatRef.current = setInterval(beat, 15_000);
    // Quando a internet volta, envia a fila na hora em vez de esperar o próximo batimento.
    const goOnline = () => beat();
    const goOffline = () => {
      if (sessionRef.current === session)
        setState((current) => ({ ...current, status: "offline" }));
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = undefined;
    };
  }, [state.status, state.code, applyRoom, publish]);

  const selfId = state.participantId;
  const cursors: RemoteCursor[] = useMemo(() => {
    void cursorTick;
    const people = new Map((state.room?.participants ?? []).map((item) => [item.id, item]));
    return [...cursorSeenRef.current.entries()]
      .filter(([id]) => id !== selfId && people.get(id)?.online !== false)
      .flatMap(([id, seen]) => {
        const person = people.get(id);
        return person
          ? [
              {
                participantId: id,
                displayName: person.displayName,
                avatarUrl: person.avatarUrl,
                x: seen.x,
                y: seen.y,
              },
            ]
          : [];
      });
  }, [cursorTick, selfId, state.room?.participants]);

  const notice =
    state.status === "offline"
      ? "Sem conexão. Suas alterações ficam neste aparelho e serão enviadas quando a internet voltar."
      : state.status === "reconnecting"
        ? "Reconectando ao caderno…"
        : hasPending && state.status === "online"
          ? "Enviando alterações…"
          : "";

  return {
    state,
    activity,
    notice,
    hasPending,
    cursors,
    sendCursor,
    create,
    join,
    publish: publishDebounced,
    leave,
  };
}
