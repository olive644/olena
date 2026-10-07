import { useCallback, useEffect, useRef, useState } from "react";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { roomAppCheckToken } from "../data/room-app-check";
import {
  isValidLocalRoomCode,
  normalizeLocalRoomCode,
  sanitizeDisplayName,
} from "../domain/local-room";
import type {
  LocalRoomAnswerFeedback,
  LocalRoomSettings,
  PublicLocalRoomState,
} from "../domain/local-room";
import type { ListeningCard } from "../domain/listening-quiz";

type Role = "choose" | "host" | "participant";
export type StoredLocalRoomSession = {
  role: Exclude<Role, "choose">;
  code: string;
  credential: string;
  participating?: boolean;
};
export type RoomConnectionStatus =
  "disconnected" | "connecting" | "online" | "reconnecting" | "offline";

export const LOCAL_ROOM_SESSION_KEY = "helena:local-room-session:v1";

export function readStoredLocalRoomSession(
  storage?: Pick<Storage, "getItem">,
): StoredLocalRoomSession | undefined {
  try {
    const target = storage ?? (typeof window === "undefined" ? undefined : window.sessionStorage);
    const raw = target?.getItem(LOCAL_ROOM_SESSION_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Partial<StoredLocalRoomSession>;
    if (
      (value.role !== "host" && value.role !== "participant") ||
      typeof value.code !== "string" ||
      !isValidLocalRoomCode(value.code) ||
      typeof value.credential !== "string" ||
      !value.credential
    ) {
      return undefined;
    }
    return {
      role: value.role,
      code: normalizeLocalRoomCode(value.code),
      credential: value.credential,
      ...(value.participating === true ? { participating: true } : {}),
    };
  } catch {
    return undefined;
  }
}

function writeStoredLocalRoomSession(session: StoredLocalRoomSession) {
  try {
    window.sessionStorage.setItem(LOCAL_ROOM_SESSION_KEY, JSON.stringify(session));
  } catch {
    // A sala continua funcionando mesmo quando o navegador bloqueia storage.
  }
}

function clearStoredLocalRoomSession() {
  try {
    window.sessionStorage.removeItem(LOCAL_ROOM_SESSION_KEY);
  } catch {
    // Nada a limpar quando o navegador bloqueia storage.
  }
}

// O Realtime Database do Firebase omite chaves cujo valor é um array vazio
// (ou objeto vazio) em vez de mandá-las como "[]", ao contrário do
// JSON.stringify comum, que preserva arrays vazios. Isso só afeta o estado
// que chega pelo EventSource (lido direto do Firebase); as respostas da
// nossa própria API usam JSON.stringify normal e não têm esse problema.
export function normalizeRoomState(data: Partial<PublicLocalRoomState>): PublicLocalRoomState {
  const strings = (value: unknown) =>
    value === undefined ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"));
  if (
    !data ||
    typeof data !== "object" ||
    typeof data.code !== "string" ||
    !isValidLocalRoomCode(data.code) ||
    !["lobby", "playing", "results", "finished"].includes(data.phase ?? "") ||
    (data.roundId !== undefined && typeof data.roundId !== "string") ||
    !data.settings ||
    ![5, 10, 15, 30, 45, 60].includes(data.settings.roundSeconds) ||
    !["mixed", "easy", "medium", "hard"].includes(data.settings.difficulty) ||
    ![5, 10, 15, 20, "all"].includes(data.settings.questionCount) ||
    (data.settings.readyWordIds !== undefined && !strings(data.settings.readyWordIds)) ||
    // Salas antigas podem conter a velocidade anterior, mas não a expomos mais.
    (data.settings.audioRate !== undefined && ![0.75, 1].includes(data.settings.audioRate)) ||
    (data.settings.audioRepetitions !== undefined &&
      ![1, 2, 3, "unlimited"].includes(data.settings.audioRepetitions)) ||
    (data.settings.autoPlayAudio !== undefined &&
      typeof data.settings.autoPlayAudio !== "boolean") ||
    (data.settings.recordedAudioRequired !== undefined &&
      typeof data.settings.recordedAudioRequired !== "boolean") ||
    (data.settings.acceptMinorTypos !== undefined &&
      typeof data.settings.acceptMinorTypos !== "boolean") ||
    [
      data.questionIndex,
      data.questionStartedAt,
      data.countdownStartedAt,
      data.feedbackUntil,
      data.totalQuestions,
      data.revision,
      data.expiresAt,
    ].some((value) => value !== undefined && (!Number.isFinite(value) || value < 0)) ||
    !strings(data.answeredParticipantIds) ||
    !strings(data.removedParticipantIds) ||
    (data.locked !== undefined && typeof data.locked !== "boolean") ||
    !strings(data.drawnIds) ||
    !strings(data.bingoWinnerIds) ||
    (data.bingoDrawCount !== undefined &&
      (!Number.isInteger(data.bingoDrawCount) ||
        data.bingoDrawCount < 0 ||
        data.bingoDrawCount > 75)) ||
    (data.bingoClaim !== undefined &&
      (!data.bingoClaim ||
        typeof data.bingoClaim.id !== "string" ||
        typeof data.bingoClaim.participantId !== "string" ||
        !Number.isFinite(data.bingoClaim.claimedAt) ||
        data.bingoClaim.claimedAt < 0)) ||
    (data.participants !== undefined &&
      (!Array.isArray(data.participants) ||
        data.participants.some(
          (p) =>
            !p ||
            typeof p.id !== "string" ||
            typeof p.displayName !== "string" ||
            !Number.isFinite(p.score) ||
            (p.reward !== undefined &&
              (!p.reward ||
                typeof p.reward.id !== "string" ||
                !Number.isSafeInteger(p.reward.place) ||
                p.reward.place < 1 ||
                !Number.isSafeInteger(p.reward.xp) ||
                p.reward.xp < 0 ||
                p.reward.xp > 100 ||
                !Number.isFinite(p.reward.completedAt))) ||
            !strings(p.bingoCard) ||
            !strings(p.bingoMarks),
        ))) ||
    (data.currentQuestion &&
      (typeof data.currentQuestion.id !== "string" ||
        typeof data.currentQuestion.front !== "string")) ||
    (data.content &&
      (!Number.isFinite(data.content.count) ||
        !Array.isArray(data.content.preview) ||
        !strings(data.content.preview))) ||
    (data.bingoWords !== undefined &&
      (!Array.isArray(data.bingoWords) ||
        data.bingoWords.some(
          (word) => !word || typeof word.id !== "string" || typeof word.text !== "string",
        )))
  )
    throw new Error("A sala enviou dados inválidos. Tente reconectar.");
  return {
    ...(data.revision === undefined ? {} : { revision: data.revision }),
    ...(data.expiresAt === undefined ? {} : { expiresAt: data.expiresAt }),
    ...(data.generation === undefined ? {} : { generation: data.generation }),
    ...(data.roundId === undefined ? {} : { roundId: data.roundId }),
    ...(data.bingoDrawCount === undefined ? {} : { bingoDrawCount: data.bingoDrawCount }),
    ...(data.bingoClaim ? { bingoClaim: data.bingoClaim } : {}),
    ...(data.locked ? { locked: true } : {}),
    ...(data.removedParticipantIds?.length
      ? { removedParticipantIds: data.removedParticipantIds }
      : {}),
    ...(data.bingoWinnerIds ? { bingoWinnerIds: data.bingoWinnerIds } : {}),
    ...(data.content ? { content: data.content } : {}),
    // O bingo de números não tem bingoWords, mas os números sorteados precisam chegar pelo
    // canal em tempo real: sem eles o globo, o histórico e a cartela voltam ao início.
    ...(data.bingoWords ? { bingoWords: data.bingoWords } : {}),
    ...(data.bingoWords || data.drawnIds || data.bingoDrawCount !== undefined
      ? { drawnIds: data.drawnIds ?? [] }
      : {}),
    code: data.code ?? "",
    phase: data.phase ?? "lobby",
    settings: data.settings ?? { difficulty: "mixed", questionCount: 10, roundSeconds: 30 },
    participants: data.participants ?? [],
    questionIndex: data.questionIndex ?? 0,
    questionStartedAt: data.questionStartedAt ?? 0,
    ...(data.countdownStartedAt === undefined
      ? {}
      : { countdownStartedAt: data.countdownStartedAt }),
    ...(data.feedbackUntil === undefined ? {} : { feedbackUntil: data.feedbackUntil }),
    totalQuestions: data.totalQuestions ?? 0,
    answeredParticipantIds: data.answeredParticipantIds ?? [],
    ...(data.currentQuestion ? { currentQuestion: data.currentQuestion } : {}),
  };
}

class RoomRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly invalidSession = false,
  ) {
    super(message);
  }
}

// Só a mensagem de um RoomRequestError é confiável em português (vem do servidor ou do
// texto padrão abaixo, em sendRoom). Qualquer outro erro (timeout do AbortController, "Failed
// to fetch" por falta de rede, etc.) vem em inglês, direto do navegador: mostrar
// `caught.message` nesses casos exibia esse texto sem tradução.
function roomErrorMessage(caught: unknown, fallback: string): string {
  return caught instanceof RoomRequestError ? caught.message : fallback;
}

async function sendRoom<T>(
  action: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
  onServerTime: (offsetMs: number) => void,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const combinedSignal = AbortSignal.any([controller.signal, signal]);
  let cancelTokenWait: (() => void) | undefined;
  try {
    combinedSignal.throwIfAborted();
    // As proteções são preparadas juntas, dentro do prazo da conexão.
    // O token da conta preserva a exclusividade por dispositivo no servidor.
    const [appCheckToken, accountToken] = await Promise.race([
      Promise.all([
        roomAppCheckToken(),
        getFirebaseAccountServices()
          .then(({ auth }) => auth.currentUser?.getIdToken())
          .catch(() => undefined),
      ]),
      new Promise<never>((_, reject) => {
        cancelTokenWait = () =>
          reject(new DOMException("A conexão demorou demais. Tente novamente.", "AbortError"));
        combinedSignal.addEventListener("abort", cancelTokenWait, { once: true });
      }),
    ]);
    const sentAt = Date.now();
    const response = await fetch(`/api/local-room?action=${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
        ...(accountToken ? { Authorization: `Bearer ${accountToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: combinedSignal,
    });
    const receivedAt = Date.now();
    const serverTime = Number(response.headers.get("X-Room-Server-Time"));
    if (response.headers.has("X-Room-Server-Time") && Number.isFinite(serverTime)) {
      onServerTime(serverTime - (sentAt + receivedAt) / 2);
    }
    const payload = (await response.json().catch(() => ({}))) as T & {
      error?: string;
      code?: string;
    };
    if (!response.ok)
      throw new RoomRequestError(
        payload.error ?? "Não foi possível falar com a sala agora.",
        response.status,
        payload.code === "invalid_session",
      );
    if (payload && typeof payload === "object" && "state" in payload)
      normalizeRoomState(payload.state as Partial<PublicLocalRoomState>);
    return payload;
  } finally {
    if (cancelTokenWait) combinedSignal.removeEventListener("abort", cancelTokenWait);
    clearTimeout(timeout);
  }
}

export function useLocalRoom(initialJoinCode?: string) {
  const requestsRef = useRef(new Set<AbortController>());
  const clockOffsetRef = useRef(0);
  async function requestRoom<T>(action: string, body: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    requestsRef.current.add(controller);
    try {
      return await sendRoom<T>(action, body, controller.signal, (offset) => {
        clockOffsetRef.current = offset;
      });
    } finally {
      requestsRef.current.delete(controller);
    }
  }
  const [storedSession] = useState(() => {
    const session = readStoredLocalRoomSession();
    if (initialJoinCode && session?.code !== normalizeLocalRoomCode(initialJoinCode)) {
      clearStoredLocalRoomSession();
      return undefined;
    }
    return session;
  });
  const [role, setRole] = useState<Role>(storedSession?.role ?? "choose");
  const [hasSavedSession, setHasSavedSession] = useState(Boolean(storedSession));
  const [state, updateState] = useState<PublicLocalRoomState>();
  const [hostDeck, setHostDeck] = useState<ListeningCard[]>([]);
  const [hostPlaying, setHostPlaying] = useState(storedSession?.participating === true);
  function setState(next: PublicLocalRoomState | undefined) {
    updateState((current) =>
      !next
        ? undefined
        : current?.code === next.code && (current.revision ?? -1) > (next.revision ?? 0)
          ? current
          : next,
    );
  }
  const [error, setError] = useState("");
  const [participantId, setParticipantId] = useState(
    storedSession?.role === "participant" ? storedSession.credential : "",
  );
  const [isRestoring, setIsRestoring] = useState(Boolean(storedSession));
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<RoomConnectionStatus>("disconnected");
  const hostTokenRef = useRef(storedSession?.role === "host" ? storedSession.credential : "");
  const participantTokenRef = useRef(
    storedSession?.role === "participant" ? storedSession.credential : "",
  );
  const serverNow = useCallback(() => Date.now() + clockOffsetRef.current, []);
  const speechCredential = useCallback(
    () =>
      role === "host" && !hostPlaying
        ? hostTokenRef.current
        : role === "participant" || hostPlaying
          ? participantTokenRef.current
          : undefined,
    [role, hostPlaying],
  );
  const pendingRef = useRef(false);
  const createRequestRef = useRef(crypto.randomUUID());
  const joinRequestRef = useRef({ identity: "", id: crypto.randomUUID() });
  const [busy, setBusy] = useState(false);
  const codeRef = useRef(storedSession?.code ?? "");
  const eventSourceRef = useRef<EventSource | undefined>(undefined);
  const streamHealthyRef = useRef(false);

  const identityRef = useRef({ role, participantId });
  useEffect(() => {
    identityRef.current = { role, participantId };
  }, [role, participantId]);

  function stopStreaming() {
    streamHealthyRef.current = false;
    eventSourceRef.current?.close();
    eventSourceRef.current = undefined;
    setConnectionStatus("disconnected");
  }

  // Conecta direto no Realtime Database do Firebase (fora do domínio do
  // app) por Server-Sent Events nativos do navegador, sem SDK, sem
  // polling: cada mudança que o servidor grava em /rooms/<code> chega aqui
  // instantaneamente.
  // Quem o anfitrião removeu sai da sala sem avisar o servidor (o token já não vale mais) e
  // volta à tela inicial com a explicação, em vez de ficar preso numa sala que o ignora.
  function removedFromRoom(next: PublicLocalRoomState) {
    // O stream guarda esta função da hora em que abriu, então lê a identidade atual por ref.
    const { role: currentRole, participantId: currentId } = identityRef.current;
    if (currentRole !== "participant" || !currentId) return false;
    if (!next.removedParticipantIds?.includes(currentId)) return false;
    stopStreaming();
    clearStoredLocalRoomSession();
    setHasSavedSession(false);
    setState(undefined);
    setRole("choose");
    setParticipantId("");
    participantTokenRef.current = "";
    codeRef.current = "";
    setError("O anfitrião removeu você desta sala.");
    return true;
  }

  function startStreaming(streamUrl: string) {
    stopStreaming();
    setConnectionStatus(navigator.onLine ? "connecting" : "offline");
    const source = new EventSource(streamUrl);
    eventSourceRef.current = source;
    source.onopen = () => {
      if (eventSourceRef.current !== source) return;
      streamHealthyRef.current = true;
      setConnectionStatus("online");
    };
    source.onerror = () => {
      if (eventSourceRef.current !== source) return;
      streamHealthyRef.current = false;
      setConnectionStatus(navigator.onLine ? "reconnecting" : "offline");
    };
    source.addEventListener("cancel", () => {
      if (eventSourceRef.current !== source) return;
      source.close();
      streamHealthyRef.current = false;
      setConnectionStatus(navigator.onLine ? "reconnecting" : "offline");
    });
    source.addEventListener("put", (event) => {
      if (eventSourceRef.current !== source) return;
      try {
        const payload = JSON.parse((event as MessageEvent<string>).data) as {
          path: string;
          data: PublicLocalRoomState | null;
        };
        if (payload.path === "/" && payload.data) {
          const next = normalizeRoomState(payload.data);
          if (removedFromRoom(next)) return;
          setState(next);
          streamHealthyRef.current = true;
          setConnectionStatus("online");
        }
        if (payload.path === "/" && payload.data === null) {
          stopStreaming();
          setError("Esta sala expirou ou foi encerrada.");
        }
      } catch {
        // Evento malformado: ignora e espera o próximo.
      }
    });
  }

  useEffect(() => {
    const session = readStoredLocalRoomSession();
    if (!session || codeRef.current !== session.code) return;
    let active = true;
    setIsRestoring(true);
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    void requestRoom<{
      state: PublicLocalRoomState;
      streamUrl: string;
      participantId?: string;
      sourceDeck?: ListeningCard[];
      participantToken?: string;
    }>("resume", {
      code: session.code,
      role: session.role,
      credential: session.credential,
    })
      .then((payload) => {
        if (!active) return;
        setState(payload.state);
        setError("");
        if (session.role === "host") {
          setHostDeck(payload.sourceDeck ?? []);
          participantTokenRef.current = payload.participantToken ?? "";
          setHostPlaying(Boolean(payload.participantToken));
        }
        if (payload.participantId) setParticipantId(payload.participantId);
        startStreaming(payload.streamUrl);
      })
      .catch((caught) => {
        if (!active) return;
        if (
          caught instanceof RoomRequestError &&
          (caught.status === 404 || caught.invalidSession)
        ) {
          clearStoredLocalRoomSession();
          setHasSavedSession(false);
          hostTokenRef.current = "";
          codeRef.current = "";
          setParticipantId("");
          setRole("choose");
        } else {
          setConnectionStatus(navigator.onLine ? "reconnecting" : "offline");
          retryTimer = setTimeout(() => setRestoreAttempt((attempt) => attempt + 1), 5000);
        }
        setError(roomErrorMessage(caught, "Não foi possível retomar a sala."));
      })
      .finally(() => {
        if (active) setIsRestoring(false);
      });
    return () => {
      active = false;
      clearTimeout(retryTimer);
    };
    // A sessão é capturada uma vez na montagem; o streaming tem ciclo próprio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreAttempt]);

  useEffect(() => {
    if (!state || state.phase === "finished") return;
    let active = true;
    let running = false;
    let lastBeat = 0;
    const beat = async () => {
      if (running || !navigator.onLine) return;
      const deadlinePassed =
        state.phase === "playing" &&
        !(state.settings.activity === "bingo" && state.settings.bingoMode) &&
        Date.now() + clockOffsetRef.current >=
          (state.feedbackUntil ?? state.questionStartedAt + state.settings.roundSeconds * 1000);
      const interval = streamHealthyRef.current && !deadlinePassed ? 15000 : 1000;
      if (Date.now() - lastBeat < interval) return;
      running = true;
      lastBeat = Date.now();
      try {
        const payload = await requestRoom<{ state: PublicLocalRoomState }>("heartbeat", {
          code: codeRef.current,
          role,
          credential: role === "host" ? hostTokenRef.current : participantTokenRef.current,
        });
        if (active) {
          setState(payload.state);
          setConnectionStatus("online");
        }
      } catch (caught) {
        if (
          active &&
          caught instanceof RoomRequestError &&
          (caught.status === 404 || caught.invalidSession)
        ) {
          stopStreaming();
          clearStoredLocalRoomSession();
          setError(caught.message);
          setState(undefined);
          setRole("choose");
        } else if (active) setConnectionStatus("reconnecting");
      } finally {
        running = false;
      }
    };
    const timer = window.setInterval(() => void beat(), 1000);
    const visible = () => {
      if (document.visibilityState === "visible") {
        lastBeat = 0;
        void beat();
      }
    };
    window.addEventListener("online", beat);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("online", beat);
      document.removeEventListener("visibilitychange", visible);
    };
    // The identity changes only when joining or leaving the room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.code, state?.phase, state?.questionStartedAt, state?.feedbackUntil, role]);

  useEffect(() => {
    const requests = requestsRef.current;
    const handleOffline = () => eventSourceRef.current && setConnectionStatus("offline");
    const handleOnline = () => {
      streamHealthyRef.current = false;
      if (eventSourceRef.current) setConnectionStatus("reconnecting");
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      stopStreaming();
      for (const controller of requests) controller.abort();
    };
  }, []);

  async function createRoom(settings: LocalRoomSettings) {
    if (pendingRef.current) return undefined;
    pendingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = await requestRoom<{
        code: string;
        hostToken: string;
        state: PublicLocalRoomState;
        streamUrl: string;
      }>("create", { settings, requestId: createRequestRef.current });
      hostTokenRef.current = payload.hostToken;
      codeRef.current = payload.code;
      writeStoredLocalRoomSession({
        role: "host",
        code: payload.code,
        credential: payload.hostToken,
      });
      setState(payload.state);
      setHostDeck([]);
      setRole("host");
      setHasSavedSession(true);
      startStreaming(payload.streamUrl);
      return { code: payload.code, hostToken: payload.hostToken };
    } catch (caught) {
      if (caught instanceof RoomRequestError && caught.status === 409)
        createRequestRef.current = crypto.randomUUID();
      setError(roomErrorMessage(caught, "Não foi possível criar a sala."));
      return undefined;
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  async function joinRoom(code: string, name: string, avatarUrl?: string) {
    setError("");
    const roomCode = normalizeLocalRoomCode(code);
    const displayName = sanitizeDisplayName(name);
    if (!isValidLocalRoomCode(roomCode)) {
      setError("Digite um código de sala válido com cinco caracteres.");
      return;
    }
    if (!displayName) {
      setError("Entre na sua conta para participar da sala.");
      return;
    }
    if (pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    const identity = `${roomCode}:${displayName}`;
    if (joinRequestRef.current.identity !== identity)
      joinRequestRef.current = { identity, id: crypto.randomUUID() };
    try {
      const payload = await requestRoom<{
        participantId: string;
        participantToken: string;
        state: PublicLocalRoomState;
        streamUrl: string;
      }>("join", { code: roomCode, displayName, avatarUrl, requestId: joinRequestRef.current.id });
      setParticipantId(payload.participantId);
      participantTokenRef.current = payload.participantToken;
      codeRef.current = roomCode;
      writeStoredLocalRoomSession({
        role: "participant",
        code: roomCode,
        credential: payload.participantToken,
      });
      setState(payload.state);
      setRole("participant");
      setHasSavedSession(true);
      startStreaming(payload.streamUrl);
    } catch (caught) {
      setError(roomErrorMessage(caught, "Não foi possível entrar na sala."));
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  async function updateSettings(
    settings: Partial<LocalRoomSettings>,
    sourceDeck?: {
      id: string;
      front: string;
      back: string;
      acceptedAnswers?: readonly string[];
    }[],
  ) {
    try {
      const payload = await requestRoom<{
        state: PublicLocalRoomState;
        sourceDeck: ListeningCard[];
      }>("settings", {
        code: codeRef.current,
        hostToken: hostTokenRef.current,
        settings,
        ...(sourceDeck ? { sourceDeck } : {}),
      });
      setState(payload.state);
      setHostDeck(payload.sourceDeck);
      return true;
    } catch (caught) {
      setError(roomErrorMessage(caught, "Não foi possível salvar."));
      return false;
    }
  }

  async function assignTeam(participantId: string, team: "Roxo" | "Amarelo") {
    try {
      const payload = await requestRoom<{ state: PublicLocalRoomState }>("team", {
        code: codeRef.current,
        participantId,
        team,
        ...(role === "host"
          ? { hostToken: hostTokenRef.current }
          : { participantToken: participantTokenRef.current }),
      });
      setState(payload.state);
      setError("");
      return true;
    } catch (caught) {
      setError(roomErrorMessage(caught, "Não foi possível mudar de equipe."));
      return false;
    }
  }

  async function kickParticipant(targetId: string) {
    try {
      const payload = await requestRoom<{ state: PublicLocalRoomState }>("kick", {
        code: codeRef.current,
        hostToken: hostTokenRef.current,
        participantId: targetId,
      });
      setState(payload.state);
      setError("");
      return true;
    } catch (caught) {
      setError(roomErrorMessage(caught, "Não foi possível remover o participante."));
      return false;
    }
  }

  async function setRoomLocked(locked: boolean) {
    try {
      const payload = await requestRoom<{ state: PublicLocalRoomState }>("lock", {
        code: codeRef.current,
        hostToken: hostTokenRef.current,
        locked,
      });
      setState(payload.state);
      setError("");
      return true;
    } catch (caught) {
      setError(
        roomErrorMessage(
          caught,
          locked ? "Não foi possível fechar a entrada." : "Não foi possível reabrir a entrada.",
        ),
      );
      return false;
    }
  }

  async function startRound() {
    try {
      const payload = await requestRoom<{ state: PublicLocalRoomState }>("start", {
        code: codeRef.current,
        hostToken: hostTokenRef.current,
      });
      setState(payload.state);
    } catch (caught) {
      setError(roomErrorMessage(caught, "Não foi possível iniciar a rodada."));
    }
  }

  async function nextQuestion() {
    try {
      const payload = await requestRoom<{ state: PublicLocalRoomState }>("next", {
        code: codeRef.current,
        hostToken: hostTokenRef.current,
        questionIndex: state?.questionIndex,
        bingoDrawCount: state?.bingoDrawCount,
      });
      setState(payload.state);
      setError("");
    } catch (caught) {
      setError(roomErrorMessage(caught, "Não foi possível avançar."));
    }
  }

  async function endRoom() {
    try {
      const payload = await requestRoom<{ state: PublicLocalRoomState }>("end", {
        code: codeRef.current,
        hostToken: hostTokenRef.current,
      });
      setState(payload.state);
      stopStreaming();
    } catch (caught) {
      setError(roomErrorMessage(caught, "Não foi possível encerrar a sala."));
    }
  }

  async function reviewBingo(claimId: string, decision: "reject" | "continue" | "restart") {
    try {
      const payload = await requestRoom<{ state: PublicLocalRoomState }>("bingo-review", {
        code: codeRef.current,
        hostToken: hostTokenRef.current,
        claimId,
        decision,
      });
      setState(payload.state);
      setError("");
    } catch (caught) {
      setError(roomErrorMessage(caught, "Não foi possível concluir a conferência."));
      throw caught;
    }
  }

  async function repeatRound() {
    try {
      const payload = await requestRoom<{ state: PublicLocalRoomState }>("repeat", {
        code: codeRef.current,
        hostToken: hostTokenRef.current,
      });
      setState(payload.state);
    } catch (caught) {
      setError(roomErrorMessage(caught, "Não foi possível repetir a atividade."));
    }
  }

  async function returnToLobby() {
    try {
      const payload = await requestRoom<{ state: PublicLocalRoomState }>("lobby", {
        code: codeRef.current,
        hostToken: hostTokenRef.current,
      });
      setState(payload.state);
    } catch (caught) {
      setError(roomErrorMessage(caught, "Não foi possível trocar a atividade."));
    }
  }

  async function submitAnswer(
    questionIndex: number,
    answer: string,
  ): Promise<LocalRoomAnswerFeedback | undefined> {
    try {
      const payload = await requestRoom<{
        correct: boolean;
        pointsChange: number;
        question?: { front: string; back: string };
        state: PublicLocalRoomState;
      }>("answer", {
        code: codeRef.current,
        participantId,
        participantToken: participantTokenRef.current,
        questionIndex,
        answer,
      });
      setState(payload.state);
      return {
        correct: payload.correct,
        pointsChange: payload.pointsChange,
        ...(payload.question ? { question: payload.question } : {}),
      };
    } catch (caught) {
      setError(roomErrorMessage(caught, "Não foi possível enviar a resposta."));
      return undefined;
    }
  }

  function reset() {
    for (const controller of requestsRef.current) controller.abort();
    createRequestRef.current = crypto.randomUUID();
    if (codeRef.current)
      void requestRoom("leave", {
        code: codeRef.current,
        role,
        credential: role === "host" ? hostTokenRef.current : participantTokenRef.current,
      }).catch(() => {});
    stopStreaming();
    clearStoredLocalRoomSession();
    setHasSavedSession(false);
    setState(undefined);
    setHostDeck([]);
    setError("");
    setRole("choose");
    hostTokenRef.current = "";
    setParticipantId("");
    participantTokenRef.current = "";
    setHostPlaying(false);
    codeRef.current = "";
  }

  async function setHostParticipation(active: boolean, displayName: string, avatarUrl?: string) {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setBusy(true);
    try {
      const payload = await requestRoom<{
        state: PublicLocalRoomState;
        participantId?: string;
        participantToken?: string;
      }>("host-player", {
        code: codeRef.current,
        hostToken: hostTokenRef.current,
        active,
        displayName,
        avatarUrl,
      });
      setState(payload.state);
      participantTokenRef.current = payload.participantToken ?? "";
      setParticipantId(payload.participantId ?? "");
      setHostPlaying(Boolean(payload.participantToken));
      writeStoredLocalRoomSession({
        role: "host",
        code: codeRef.current,
        credential: hostTokenRef.current,
        participating: Boolean(payload.participantToken),
      });
      setError("");
      return true;
    } catch (caught) {
      setError(roomErrorMessage(caught, "Não foi possível mudar sua participação."));
      return false;
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  return {
    role,
    state,
    hostDeck,
    error,
    isHost: role === "host" && !(hostPlaying && state?.phase === "playing"),
    isOrganizer: role === "host",
    hostPlaying,
    setHostParticipation,
    participantId,
    isRestoring,
    hasSavedSession,
    connectionStatus,
    busy,
    setRole,
    reconnect: () => setRestoreAttempt((attempt) => attempt + 1),
    createRoom,
    joinRoom,
    updateSettings,
    assignTeam,
    kickParticipant,
    setRoomLocked,
    startRound,
    nextQuestion,
    reviewBingo,
    endRoom,
    repeatRound,
    returnToLobby,
    submitAnswer,
    reset,
    serverNow,
    speechCredential,
    organizerCredential: () => (role === "host" ? hostTokenRef.current : undefined),
  };
}
