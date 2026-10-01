import {
  addLocalParticipant,
  advanceRoomQuestion,
  canAdvanceRoomQuestion,
  createLocalRoomCode,
  createRoom,
  endRoom,
  repeatRoom,
  returnRoomToLobby,
  isValidLocalRoomCode,
  MAX_ROOM_PARTICIPANTS,
  normalizeLocalRoomCode,
  localRoomStorageKey,
  localRoomPool,
  ROOM_TTL_SECONDS,
  ROOM_PRESENCE_GRACE_MS,
  ROOM_CATEGORIES,
  sanitizeDisplayName,
  sanitizeRoomAvatar,
  startRoom,
  submitRoomAnswer,
  toPublicRoomState,
  updateRoomSettings,
  type LocalRoomSettings,
  type LocalRoomState,
  type PublicLocalRoomState,
} from "../domain/local-room.js";
import type { KvStore } from "./kv-store.js";
import { RoomConflict, versionedStore } from "./room-transaction.js";
import { safeEqual } from "./secure-compare.js";
import { createHash } from "node:crypto";
import {
  READY_LISTENING_SOURCE,
  validReadyListeningWordIds,
} from "../domain/ready-listening-words.js";

export type LocalRoomHandlerDependencies = {
  store: KvStore;
  publish(code: string, publicState: PublicLocalRoomState): Promise<void>;
  streamUrl(code: string): string;
  now?(): number;
  randomCode?(): string;
  randomId?(): string;
  guard?(request: Request): Promise<Response | undefined>;
  observe?(event: { action: string; status: number; durationMs: number }): void;
  // Identidade opcional da conta Google por trás do pedido (ver firebase-account-identity.ts).
  // A sala continua funcionando sem login; quando presente, serve só para impedir que a mesma
  // conta entre duas vezes na mesma sala por dispositivos diferentes.
  authenticate?(request: Request): Promise<{ uid: string; name: string } | undefined>;
};

type RoomIdentity = { uid: string; name: string } | undefined;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Room-Server-Time": String(Date.now()),
    },
  });
}

function isSettingsPayload(value: unknown): value is Partial<LocalRoomSettings> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (Array.isArray(value)) return false;
  if (
    Object.keys(candidate).some(
      (key) =>
        ![
          "difficulty",
          "questionCount",
          "roundSeconds",
          "activity",
          "category",
          "shuffle",
          "teams",
          "readyWordIds",
          "subjectName",
          "audioRepetitions",
          "autoPlayAudio",
          "recordedAudioRequired",
          "acceptMinorTypos",
        ].includes(key),
    )
  )
    return false;
  if (
    "subjectName" in candidate &&
    (typeof candidate["subjectName"] !== "string" || candidate["subjectName"].length > 80)
  )
    return false;
  if ("activity" in candidate && !["listening", "bingo"].includes(candidate["activity"] as string))
    return false;
  if (
    "category" in candidate &&
    candidate["category"] !== "" &&
    !ROOM_CATEGORIES.includes(candidate["category"] as string)
  )
    return false;
  if (
    ["shuffle", "teams", "autoPlayAudio", "recordedAudioRequired", "acceptMinorTypos"].some(
      (key) => key in candidate && typeof candidate[key] !== "boolean",
    )
  )
    return false;
  if ("readyWordIds" in candidate && !validReadyListeningWordIds(candidate["readyWordIds"]))
    return false;
  if (
    "difficulty" in candidate &&
    !["mixed", "easy", "medium", "hard"].includes(candidate["difficulty"] as string)
  ) {
    return false;
  }
  if (
    "questionCount" in candidate &&
    ![5, 10, 15, 20, "all"].includes(candidate["questionCount"] as number | string)
  ) {
    return false;
  }
  if (
    "roundSeconds" in candidate &&
    ![5, 10, 15, 30, 45, 60].includes(candidate["roundSeconds"] as number)
  ) {
    return false;
  }
  if (
    "audioRepetitions" in candidate &&
    ![1, 2, 3, "unlimited"].includes(candidate["audioRepetitions"] as number | string)
  ) {
    return false;
  }
  return true;
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const payload = (await request.json()) as unknown;
    return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function loadRoom(store: KvStore, code: string): Promise<LocalRoomState | undefined> {
  const raw = await store.get(localRoomStorageKey(code));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as LocalRoomState;
  } catch {
    return undefined;
  }
}

function createRoomAttempt(dependencies: LocalRoomHandlerDependencies, identity: RoomIdentity) {
  const now = () => dependencies.now?.() ?? Date.now();
  const randomCode = () => dependencies.randomCode?.() ?? createLocalRoomCode();
  const randomId = () => dependencies.randomId?.() ?? crypto.randomUUID();

  async function saveRoom(state: LocalRoomState): Promise<PublicLocalRoomState> {
    state = { ...state, revision: (state.revision ?? 0) + 1 };
    await dependencies.store.set(
      localRoomStorageKey(state.code),
      JSON.stringify(state),
      Math.max(1, Math.ceil(((state.expiresAt ?? now() + ROOM_TTL_SECONDS * 1000) - now()) / 1000)),
    );
    const publicState = toPublicRoomState(state);
    await dependencies.publish(state.code, publicState);
    return publicState;
  }

  return async function handleLocalRoom(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "create" && request.method === "POST") {
      const body = await readJsonBody(request);
      if (!isSettingsPayload(body["settings"])) {
        return jsonResponse(400, { error: "Configurações inválidas." });
      }
      const settings: LocalRoomSettings = {
        ...(body["settings"] as Partial<LocalRoomSettings>),
        difficulty: (body["settings"] as Partial<LocalRoomSettings>).difficulty ?? "mixed",
        questionCount: (body["settings"] as Partial<LocalRoomSettings>).questionCount ?? 10,
        roundSeconds: (body["settings"] as Partial<LocalRoomSettings>).roundSeconds ?? 30,
      };
      const requestId = typeof body["requestId"] === "string" ? body["requestId"] : "";
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const code = requestId
        ? Array.from(
            createHash("sha256").update(requestId).digest().subarray(0, 5),
            (byte) => alphabet[byte % alphabet.length],
          ).join("")
        : randomCode();
      const existing = await loadRoom(dependencies.store, code);
      if (existing) {
        if (requestId && existing.createRequestId === requestId) {
          await dependencies.publish(code, toPublicRoomState(existing));
          return jsonResponse(201, {
            code,
            hostToken: existing.hostToken,
            state: toPublicRoomState(existing),
            streamUrl: dependencies.streamUrl(code),
          });
        }
        return jsonResponse(409, { error: "Este código está ocupado. Tente criar uma nova sala." });
      }
      const hostToken = randomId();
      const state = createRoom(settings, {
        code,
        hostToken,
        ...(identity?.uid ? { hostAccountId: identity.uid } : {}),
        now: now(),
      });
      if (requestId) state.createRequestId = requestId;
      const publicState = await saveRoom(state);
      return jsonResponse(201, {
        code,
        hostToken,
        state: publicState,
        streamUrl: dependencies.streamUrl(code),
      });
    }

    if (action === "join" && request.method === "POST") {
      const body = await readJsonBody(request);
      const code = typeof body["code"] === "string" ? normalizeLocalRoomCode(body["code"]) : "";
      const displayName = sanitizeDisplayName(
        typeof body["displayName"] === "string" ? body["displayName"] : "",
      );
      const avatarUrl = sanitizeRoomAvatar(body["avatarUrl"]);
      if (!isValidLocalRoomCode(code) || !displayName) {
        return jsonResponse(400, { error: "Código ou nome de exibição inválidos." });
      }
      const state = await loadRoom(dependencies.store, code);
      if (!state) return jsonResponse(404, { error: "Sala não encontrada." });
      const requestId = typeof body["requestId"] === "string" ? body["requestId"] : "";
      const receipt = requestId ? state.receipts?.[`join:${requestId}`] : undefined;
      if (receipt) {
        await dependencies.publish(code, toPublicRoomState(state));
        return jsonResponse(200, {
          ...receipt,
          state: toPublicRoomState(state),
          streamUrl: dependencies.streamUrl(code),
        });
      }
      if (state.phase !== "lobby") {
        return jsonResponse(409, { error: "Esta sala já começou a atividade." });
      }
      if (state.participants.filter((p) => p.online !== false).length >= MAX_ROOM_PARTICIPANTS) {
        return jsonResponse(409, { error: "Esta sala atingiu o limite de participantes." });
      }
      if (
        state.participants.some(
          (participant) => participant.displayName.toLowerCase() === displayName.toLowerCase(),
        )
      ) {
        return jsonResponse(409, { error: "Esse nome já está em uso nesta sala." });
      }
      if (
        identity?.uid &&
        (state.hostAccountId === identity.uid ||
          state.participants.some(
            (participant) => participant.accountId === identity.uid && participant.online !== false,
          ))
      ) {
        return jsonResponse(409, {
          error: "Esta conta já está nesta sala em outro dispositivo.",
          code: "already_in_room",
        });
      }
      const participantId = randomId();
      const participantToken = randomId();
      const updated = addLocalParticipant(
        state,
        {
          id: participantId,
          token: participantToken,
          displayName,
          ...(avatarUrl ? { avatarUrl } : {}),
          ...(identity?.uid ? { accountId: identity.uid } : {}),
          score: 0,
          lastSeenAt: now(),
          online: true,
          ...(state.settings.teams
            ? { team: state.participants.length % 2 === 0 ? "Roxo" : "Amarelo" }
            : {}),
        },
        now(),
      );
      if (requestId)
        updated.receipts = {
          ...updated.receipts,
          [`join:${requestId}`]: { participantId, participantToken },
        };
      const publicState = await saveRoom(updated);
      return jsonResponse(200, {
        participantId,
        participantToken,
        state: publicState,
        streamUrl: dependencies.streamUrl(code),
      });
    }

    if (["resume", "heartbeat", "leave"].includes(action ?? "") && request.method === "POST") {
      const body = await readJsonBody(request);
      const code = typeof body["code"] === "string" ? normalizeLocalRoomCode(body["code"]) : "";
      const role = body["role"];
      const credential = typeof body["credential"] === "string" ? body["credential"] : "";
      if (
        !isValidLocalRoomCode(code) ||
        !["host", "participant"].includes(role as string) ||
        !credential
      ) {
        return jsonResponse(400, { error: "Dados de reconexão inválidos." });
      }
      const state = await loadRoom(dependencies.store, code);
      if (!state) return jsonResponse(404, { error: "Esta sala não está mais disponível." });
      const isAuthorized =
        role === "host"
          ? safeEqual(state.hostToken, credential)
          : state.participants.some((participant) => safeEqual(participant.token, credential));
      if (!isAuthorized) {
        return jsonResponse(403, {
          error: "Não foi possível confirmar sua participação nesta sala.",
          code: "invalid_session",
        });
      }
      const time = now();
      let updated: LocalRoomState = {
        ...state,
        participants: state.participants.map((p) =>
          safeEqual(p.token, credential)
            ? { ...p, lastSeenAt: time, online: action !== "leave" }
            : { ...p, online: time - (p.lastSeenAt ?? time) < ROOM_PRESENCE_GRACE_MS },
        ),
        ...(role === "host" ? { hostLastSeenAt: time } : {}),
        updatedAt: time,
      };
      if (
        (role === "host" && action === "leave") ||
        time - (state.hostLastSeenAt ?? time) >= ROOM_PRESENCE_GRACE_MS
      )
        updated = endRoom(updated, time);
      if (updated.phase === "lobby")
        updated = {
          ...updated,
          participants: updated.participants.filter((p) => p.online !== false),
        };
      if (updated.phase === "playing" && canAdvanceRoomQuestion(updated, time))
        updated = advanceRoomQuestion(updated, time);
      const publicState = await saveRoom(updated);
      return jsonResponse(200, {
        state: publicState,
        participantId: state.participants.find((p) => safeEqual(p.token, credential))?.id,
        streamUrl: dependencies.streamUrl(code),
        ...(role === "host" ? { sourceDeck: updated.sourceDeck ?? [] } : {}),
      });
    }

    if (action === "settings" && request.method === "POST") {
      const body = await readJsonBody(request);
      const state = await requireHost(dependencies.store, body);
      if (state instanceof Response) return state;
      if (!isSettingsPayload(body["settings"])) {
        return jsonResponse(400, { error: "Configurações inválidas." });
      }
      const updated = updateRoomSettings(
        state,
        body["settings"] as Partial<LocalRoomSettings>,
        now(),
      );
      if (body["sourceDeck"] !== undefined) {
        if (state.phase !== "lobby") return jsonResponse(409, { error: "A rodada já começou." });
        const cards = body["sourceDeck"];
        if (
          !Array.isArray(cards) ||
          cards.length > 30 ||
          cards.some(
            (card) =>
              !card ||
              typeof card !== "object" ||
              typeof card.id !== "string" ||
              typeof card.front !== "string" ||
              typeof card.back !== "string" ||
              !card.front.trim() ||
              !card.back.trim() ||
              (card.acceptedAnswers !== undefined &&
                (!Array.isArray(card.acceptedAnswers) ||
                  card.acceptedAnswers.length > 10 ||
                  card.acceptedAnswers.some(
                    (answer: unknown) =>
                      typeof answer !== "string" || !answer.trim() || answer.length > 200,
                  ))) ||
              card.id.length > 80 ||
              card.front.length > 200 ||
              card.back.length > 200 ||
              (card.audioId !== undefined &&
                (typeof card.audioId !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(card.audioId))),
          )
        )
          return jsonResponse(400, {
            error: "O material deve ter até 30 cartões com frente e verso de até 200 caracteres.",
          });
        if (cards.length === 0) delete updated.sourceDeck;
        else {
          if (cards.some((card) => card.audioId && !state.recordingIds?.includes(card.audioId)))
            return jsonResponse(400, { error: "Uma gravação não pertence a esta sala." });
          updated.sourceDeck = cards.map((card, index) => ({
            id: `material-${index}`,
            front: card.front.trim(),
            back: card.back.trim(),
            ...(card.acceptedAnswers?.length
              ? { acceptedAnswers: card.acceptedAnswers.map((answer: string) => answer.trim()) }
              : {}),
            ...(card.audioId ? { audioId: card.audioId } : {}),
            difficulty: "medium",
          }));
        }
      }
      if (
        updated.settings.activity !== "bingo" &&
        updated.settings.subjectName === READY_LISTENING_SOURCE
      ) {
        delete updated.sourceDeck;
      }
      const publicState = await saveRoom(updated);
      return jsonResponse(200, { state: publicState, sourceDeck: updated.sourceDeck ?? [] });
    }

    if (action === "start" && request.method === "POST") {
      const body = await readJsonBody(request);
      const state = await requireHost(dependencies.store, body);
      if (state instanceof Response) return state;
      if (
        (state.settings.activity ?? "listening") === "listening" &&
        state.settings.recordedAudioRequired &&
        state.settings.subjectName !== READY_LISTENING_SOURCE &&
        (!state.sourceDeck?.length ||
          state.sourceDeck.some(
            (card) => !card.audioId || !state.recordingIds?.includes(card.audioId),
          ))
      ) {
        return jsonResponse(409, {
          error: "Grave ou envie o áudio de cada palavra antes de iniciar.",
        });
      }
      if (
        state.settings.subjectName === READY_LISTENING_SOURCE &&
        typeof state.settings.questionCount === "number" &&
        localRoomPool(state.settings).length < state.settings.questionCount
      )
        return jsonResponse(409, { error: "Selecione palavras suficientes para a rodada." });
      const started = startRoom(state, { now: now() });
      if (started.phase !== "playing") {
        return jsonResponse(409, { error: "É preciso ao menos um participante para iniciar." });
      }
      const publicState = await saveRoom(started);
      return jsonResponse(200, { state: publicState });
    }

    if (action === "answer" && request.method === "POST") {
      const body = await readJsonBody(request);
      const code = typeof body["code"] === "string" ? normalizeLocalRoomCode(body["code"]) : "";
      const participantId = typeof body["participantId"] === "string" ? body["participantId"] : "";
      const participantToken =
        typeof body["participantToken"] === "string" ? body["participantToken"] : "";
      const answer = typeof body["answer"] === "string" ? body["answer"] : "";
      const questionIndex = Number(body["questionIndex"]);
      if (!isValidLocalRoomCode(code) || !participantId || !Number.isInteger(questionIndex)) {
        return jsonResponse(400, { error: "Dados de resposta inválidos." });
      }
      const state = await loadRoom(dependencies.store, code);
      if (!state) return jsonResponse(404, { error: "Sala não encontrada." });
      const participant = state.participants.find(
        (p) => p.id === participantId && safeEqual(p.token, participantToken),
      );
      if (!participant) return jsonResponse(403, { error: "Não autorizado." });
      const key = `answer:${participantId}:${questionIndex}`;
      const receipt = state.receipts?.[key];
      if (receipt) {
        await dependencies.publish(code, toPublicRoomState(state));
        return jsonResponse(200, { ...receipt, state: toPublicRoomState(state) });
      }
      if (now() < state.questionStartedAt)
        return jsonResponse(409, { error: "Aguarde a contagem para responder." });
      if (now() >= state.questionStartedAt + state.settings.roundSeconds * 1000)
        return jsonResponse(409, { error: "O tempo desta pergunta acabou." });
      if (questionIndex !== state.questionIndex)
        return jsonResponse(409, { error: "Esta pergunta já terminou." });
      const result = submitRoomAnswer(state, { participantId, questionIndex, answer, now: now() });
      result.state.receipts = {
        ...result.state.receipts,
        [key]: {
          correct: result.correct,
          xpChange: result.xpChange,
          ...(result.question ? { question: result.question } : {}),
        },
      };
      const publicState = await saveRoom(result.state);
      return jsonResponse(200, {
        correct: result.correct,
        xpChange: result.xpChange,
        question: result.question,
        state: publicState,
      });
    }

    if (action === "next" && request.method === "POST") {
      const body = await readJsonBody(request);
      const state = await requireHost(dependencies.store, body);
      if (state instanceof Response) return state;
      if (body["questionIndex"] !== undefined && body["questionIndex"] !== state.questionIndex)
        return jsonResponse(200, { state: toPublicRoomState(state) });
      if (!canAdvanceRoomQuestion(state, now())) {
        return jsonResponse(409, {
          error: "Ainda dá tempo: espere todo mundo responder ou o tempo acabar.",
        });
      }
      const advanced = advanceRoomQuestion(state, now());
      const publicState = await saveRoom(advanced);
      return jsonResponse(200, { state: publicState });
    }

    if (action === "end" && request.method === "POST") {
      const body = await readJsonBody(request);
      const state = await requireHost(dependencies.store, body);
      if (state instanceof Response) return state;
      const ended = endRoom(state, now());
      const publicState = await saveRoom(ended);
      return jsonResponse(200, { state: publicState });
    }

    if (action === "repeat" && request.method === "POST") {
      const body = await readJsonBody(request);
      const state = await requireHost(dependencies.store, body);
      if (state instanceof Response) return state;
      const repeated = repeatRoom(state, { now: now() });
      if (repeated.phase !== "playing")
        return jsonResponse(409, { error: "A atividade ainda não terminou." });
      const publicState = await saveRoom(repeated);
      return jsonResponse(200, { state: publicState });
    }

    if (action === "lobby" && request.method === "POST") {
      const body = await readJsonBody(request);
      const state = await requireHost(dependencies.store, body);
      if (state instanceof Response) return state;
      const lobby = returnRoomToLobby(state, now());
      if (lobby.phase !== "lobby")
        return jsonResponse(409, { error: "A atividade ainda não terminou." });
      const publicState = await saveRoom(lobby);
      return jsonResponse(200, { state: publicState });
    }

    return jsonResponse(404, { error: "Ação desconhecida." });
  };

  async function requireHost(
    store: KvStore,
    body: Record<string, unknown>,
  ): Promise<LocalRoomState | Response> {
    const code = typeof body["code"] === "string" ? normalizeLocalRoomCode(body["code"]) : "";
    const hostToken = typeof body["hostToken"] === "string" ? body["hostToken"] : "";
    if (!isValidLocalRoomCode(code) || !hostToken) {
      return jsonResponse(400, { error: "Código ou credencial de organizador inválidos." });
    }
    const state = await loadRoom(store, code);
    if (!state) return jsonResponse(404, { error: "Sala não encontrada." });
    if (!safeEqual(state.hostToken, hostToken))
      return jsonResponse(403, { error: "Não autorizado." });
    return state;
  }
}

export function createLocalRoomHandler(dependencies: LocalRoomHandlerDependencies) {
  return async (request: Request): Promise<Response> => {
    const started = Date.now();
    const action = new URL(request.url).searchParams.get("action") ?? "unknown";
    try {
      if (request.method !== "POST") return jsonResponse(405, { error: "Método inválido." });
      if (
        request.headers.get("origin") &&
        request.headers.get("origin") !== new URL(request.url).origin
      )
        return jsonResponse(403, { error: "Origem não permitida." });
      const text = await request.text();
      if (text.length > 32768) return jsonResponse(413, { error: "Pedido muito grande." });
      const body: unknown = JSON.parse(text);
      if (!body || typeof body !== "object" || Array.isArray(body))
        return jsonResponse(400, { error: "Pedido inválido." });
      const requestId = (body as Record<string, unknown>)["requestId"];
      if (
        requestId !== undefined &&
        (typeof requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(requestId))
      )
        return jsonResponse(400, { error: "Identificador de pedido inválido." });
      const blocked = await dependencies.guard?.(request);
      if (blocked) return blocked;
      const identity = await dependencies.authenticate?.(request);
      for (let attempt = 0; attempt < 40; attempt++) {
        try {
          const result = await createRoomAttempt(
            { ...dependencies, store: versionedStore(dependencies.store) },
            identity,
          )(new Request(request.url, { method: "POST", headers: request.headers, body: text }));
          dependencies.observe?.({
            action,
            status: result.status,
            durationMs: Date.now() - started,
          });
          return result;
        } catch (error) {
          if (!(error instanceof RoomConflict)) throw error;
        }
      }
      return jsonResponse(503, { error: "Sala ocupada. Tente novamente em instantes." });
    } catch (error) {
      dependencies.observe?.({ action, status: 503, durationMs: Date.now() - started });
      return jsonResponse(error instanceof SyntaxError ? 400 : 503, {
        error:
          error instanceof SyntaxError
            ? "Pedido inválido."
            : "A conexão com a sala falhou. Tente novamente.",
      });
    }
  };
}
