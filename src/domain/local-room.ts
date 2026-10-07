import {
  createListeningRound,
  isListeningAnswerCorrect,
  STARTER_DECK,
  type ListeningCard,
} from "./listening-quiz.js";
import { READY_LISTENING_DECK, READY_LISTENING_SOURCE } from "./ready-listening-words.js";
import {
  createNumberBingoCard,
  hasNumberBingo,
  NUMBER_BINGO_DECK,
  type BingoMode,
} from "./number-bingo.js";

export type LocalRoomPhase = "lobby" | "playing" | "results" | "finished";
export type BingoReviewDecision = "reject" | "continue" | "restart" | "finish";
export type BingoClaim = { id: string; participantId: string; claimedAt: number };
export const ROOM_TEAMS = ["Roxo", "Amarelo"] as const;
export type RoomTeam = (typeof ROOM_TEAMS)[number];
export const ROOM_TEAM_LABELS: Record<RoomTeam, string> = {
  Roxo: "Lado Lunar",
  Amarelo: "Lado Solar",
};
export type RoomXpReward = { id: string; place: number; xp: number; completedAt: number };

export type LocalRoomDifficulty = "mixed" | "easy" | "medium" | "hard";

export type LocalRoomRoundSeconds = 5 | 10 | 15 | 30 | 45 | 60;

export type LocalRoomSettings = {
  difficulty: LocalRoomDifficulty;
  questionCount: 5 | 10 | 15 | 20 | "all";
  roundSeconds: LocalRoomRoundSeconds;
  activity?: "listening" | "bingo";
  bingoMode?: BingoMode;
  bingoPhysical?: boolean;
  category?: string;
  shuffle?: boolean;
  teams?: boolean;
  allowLateJoin?: boolean;
  subjectName?: string;
  readyWordIds?: string[];
  helenaWordCount?: number;
  helenaWords?: boolean;
  audioRate?: 0.75 | 1;
  audioRepetitions?: 1 | 2 | 3 | "unlimited";
  autoPlayAudio?: boolean;
  participantAudio?: boolean;
  recordedAudioRequired?: boolean;
  acceptMinorTypos?: boolean;
};

export type LocalRoomParticipant = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  score: number;
  answersCount?: number;
  lastAnswer?: { questionIndex: number; correct: boolean } | undefined;
  reward?: RoomXpReward | undefined;
  token?: string;
  // UID da conta Google, quando a pessoa está logada (nunca exposto no estado público da
  // sala): usado só para impedir que a mesma conta entre duas vezes por dispositivos diferentes.
  accountId?: string;
  lastSeenAt?: number;
  online?: boolean;
  team?: string;
  bingoMarks?: string[];
  bingoCard?: string[];
};

export function sanitizeRoomAvatar(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2048) return undefined;
  if (/^\/profile-avatars\/[a-z0-9-]+\.(?:svg|webp)$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && /(^|\.)googleusercontent\.com$/.test(url.hostname)) {
      return url.href;
    }
  } catch {
    // Invalid profile image: use the local default avatar.
  }
  return undefined;
}

export type LocalRoomQuestion = { id: string; front: string };

export type LocalRoomAnswerFeedback = {
  correct: boolean;
  pointsChange: number;
  question?: { front: string; back: string };
};

export type LocalRoomState = {
  code: string;
  hostToken: string;
  // UID da conta de quem criou a sala, quando estava logada ao criar (mesma observação de
  // privacidade do accountId do participante acima).
  hostAccountId?: string;
  phase: LocalRoomPhase;
  settings: LocalRoomSettings;
  participants: LocalRoomParticipant[];
  deck: ListeningCard[];
  questionIndex: number;
  bingoDrawCount?: number | undefined;
  bingoClaim?: BingoClaim | undefined;
  bingoClaimQueue?: BingoClaim[] | undefined;
  bingoWinnerIds?: string[] | undefined;
  questionStartedAt: number;
  countdownStartedAt?: number | undefined;
  answeredParticipantIds: string[];
  feedbackUntil?: number | undefined;
  createdAt: number;
  updatedAt: number;
  revision?: number;
  hostLastSeenAt?: number;
  hostParticipantId?: string;
  expiresAt?: number;
  receipts?: Record<
    string,
    {
      correct?: boolean;
      pointsChange?: number;
      xpChange?: number; // Recibos antigos, apenas compatibilidade de transporte.
      question?: { front: string; back: string };
      participantId?: string;
      participantToken?: string;
    }
  >;
  createRequestId?: string;
  generation?: string;
  roundId?: string;
  sourceDeck?: ListeningCard[];
  recordingIds?: string[];
};

export type PublicLocalRoomState = {
  code: string;
  roundId?: string;
  phase: LocalRoomPhase;
  settings: LocalRoomSettings;
  participants: LocalRoomParticipant[];
  questionIndex: number;
  bingoDrawCount?: number | undefined;
  bingoClaim?: BingoClaim | undefined;
  bingoClaimQueue?: BingoClaim[] | undefined;
  bingoWinnerIds?: string[] | undefined;
  questionStartedAt: number;
  countdownStartedAt?: number | undefined;
  totalQuestions: number;
  currentQuestion?: LocalRoomQuestion;
  answeredParticipantIds: string[];
  feedbackUntil?: number;
  revision?: number;
  expiresAt?: number;
  bingoWords?: { id: string; text: string }[];
  drawnIds?: string[];
  generation?: string;
  content?: {
    count: number;
    preview: string[];
    difficultyCounts?: Record<LocalRoomDifficulty, number>;
  };
};

import { LOCAL_ROOM_JOIN_PARAM } from "./room-code.js";
export {
  LOCAL_ROOM_JOIN_PARAM,
  normalizeLocalRoomCode,
  isValidLocalRoomCode,
  readLocalRoomCodeFromUrl,
} from "./room-code.js";
export const MAX_ROOM_PARTICIPANTS = 30;
export const ROOM_TTL_SECONDS = 60 * 60 * 4;
export const ROOM_PRESENCE_GRACE_MS = 120_000;
export const ROOM_FEEDBACK_MS = 3_000;
export const ROOM_START_COUNTDOWN_MS = 3_000;

export function formatRoomEstimatedDuration(
  questionCount: number,
  secondsPerQuestion: number,
  feedbackSeconds = 3,
) {
  const total = questionCount * (secondsPerQuestion + feedbackSeconds);
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return seconds ? `${minutes}min${seconds}s` : `${minutes} min`;
}

// Acertos premiam rapidez. Qualquer erro de escuta desconta cinco pontos,
// mantendo o saldo mínimo em zero e sem aplicar penalidade ao Bingo.
export const MAX_CORRECT_ANSWER_POINTS = 100;
export const MIN_CORRECT_ANSWER_POINTS = 20;
export const WRONG_ANSWER_PENALTY_POINTS = 5;

export function roomAnswerPoints(seconds: number, elapsedMs: number): number {
  const ratio = Math.max(0, Math.min(1, elapsedMs / (seconds * 1000)));
  return (
    MIN_CORRECT_ANSWER_POINTS +
    Math.round((MAX_CORRECT_ANSWER_POINTS - MIN_CORRECT_ANSWER_POINTS) * (1 - ratio))
  );
}

export function roomPlacement(
  participants: readonly LocalRoomParticipant[],
  score: number,
): number {
  return 1 + participants.filter((p) => p.score > score).length;
}

export function roomPlacementXp(place: number): number {
  return [100, 75, 50][place - 1] ?? Math.max(10, 40 - (place - 4) * 5);
}

export const BINGO_MARK_POINTS = 2;
export const BINGO_OBJECTIVE_POINTS: Record<BingoMode, number> = {
  corners: 30,
  line: 40,
  column: 40,
  diagonal: 40,
  full: 100,
};

// Listening rewards attention and response speed; bingo rewards verified marks and objectives.
export function roomEffortXp(score: number, activity: "listening" | "bingo"): number {
  return Math.min(10000, Math.max(0, Math.round(score * (activity === "bingo" ? 0.35 : 0.5))));
}

function completeRoom(state: LocalRoomState, now: number): LocalRoomState {
  const participants = state.participants.map((participant) => {
    const place = roomPlacement(state.participants, participant.score);
    return {
      ...participant,
      reward: {
        id: `${state.code}:${state.generation}:${state.roundId}:${participant.id}`,
        place,
        xp:
          (participant.answersCount ?? 0) > 0
            ? roomEffortXp(
                participant.score,
                state.settings.activity === "bingo" ? "bingo" : "listening",
              )
            : 0,
        completedAt: now,
      },
    };
  });
  return { ...state, participants, phase: "results", updatedAt: now };
}

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 5;

// O código da sala é a única barreira para entrar nela, então vem de uma fonte
// criptográfica e não de Math.random, que é previsível. O alfabeto tem 32
// símbolos (potência de dois), então mascarar cada byte com 31 escolhe um
// símbolo sem viés, sem divisão nem descarte de valores.
export function createLocalRoomCode(random?: () => number): string {
  if (random) {
    return Array.from(
      { length: ROOM_CODE_LENGTH },
      () => ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)],
    ).join("");
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte & 31]).join("");
}

export function sanitizeDisplayName(value: string): string {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
}

export function localRoomStorageKey(code: string): string {
  return `private-rooms/${code.toUpperCase()}`;
}

export function buildLocalRoomJoinUrl(origin: string, code: string): string {
  const url = new URL(origin);
  url.searchParams.set(LOCAL_ROOM_JOIN_PARAM, code.toUpperCase());
  return url.toString();
}

export function createRoom(
  settings: LocalRoomSettings,
  dependencies: { code: string; hostToken: string; hostAccountId?: string; now: number },
): LocalRoomState {
  return {
    code: dependencies.code,
    hostToken: dependencies.hostToken,
    ...(dependencies.hostAccountId ? { hostAccountId: dependencies.hostAccountId } : {}),
    phase: "lobby",
    settings: settings.helenaWords
      ? {
          ...settings,
          activity: "listening",
          subjectName: READY_LISTENING_SOURCE,
          questionCount: "all",
          difficulty: "mixed",
          category: "",
          readyWordIds: [],
        }
      : settings,
    participants: [],
    deck: [],
    questionIndex: 0,
    questionStartedAt: dependencies.now,
    answeredParticipantIds: [],
    feedbackUntil: undefined,
    createdAt: dependencies.now,
    updatedAt: dependencies.now,
    hostLastSeenAt: dependencies.now,
    expiresAt: dependencies.now + ROOM_TTL_SECONDS * 1000,
    revision: 0,
    generation: String(dependencies.now),
  };
}

export function addLocalParticipant(
  state: LocalRoomState,
  participant: LocalRoomParticipant,
  now: number,
): LocalRoomState {
  if (
    state.phase !== "lobby" ||
    state.participants.filter((p) => p.online !== false).length >= MAX_ROOM_PARTICIPANTS
  )
    return state;
  if (state.participants.some((item) => item.id === participant.id)) return state;
  return { ...state, participants: [...state.participants, participant], updatedAt: now };
}

export function updateRoomSettings(
  state: LocalRoomState,
  settings: Partial<LocalRoomSettings>,
  now: number,
): LocalRoomState {
  if (state.phase !== "lobby") return state;
  return {
    ...state,
    settings: { ...state.settings, ...settings },
    participants:
      settings.teams === undefined || settings.teams === state.settings.teams
        ? state.participants
        : state.participants.map((participant, index) => ({
            ...participant,
            team: settings.teams ? (index % 2 === 0 ? "Roxo" : "Amarelo") : "",
          })),
    updatedAt: now,
  };
}

export function assignRoomTeam(
  state: LocalRoomState,
  participantId: string,
  team: RoomTeam,
  now: number,
): LocalRoomState {
  if (state.phase !== "lobby" || !state.settings.teams || !ROOM_TEAMS.includes(team)) return state;
  return {
    ...state,
    participants: state.participants.map((participant) =>
      participant.id === participantId ? { ...participant, team } : participant,
    ),
    updatedAt: now,
  };
}

export function localRoomPool(
  settings: LocalRoomSettings,
  source?: readonly ListeningCard[],
): readonly ListeningCard[] {
  if (settings.activity === "bingo" && settings.bingoMode) return NUMBER_BINGO_DECK;
  const cards =
    settings.helenaWords === true
      ? READY_LISTENING_DECK
      : (source ??
        (settings.activity !== "bingo" && settings.subjectName === READY_LISTENING_SOURCE
          ? settings.readyWordIds === undefined
            ? READY_LISTENING_DECK
            : READY_LISTENING_DECK.filter((card) => settings.readyWordIds?.includes(card.id))
          : STARTER_DECK));
  if (settings.helenaWords === true) return cards;
  return cards.filter(
    (card) =>
      (settings.difficulty === "mixed" || card.difficulty === settings.difficulty) &&
      (!settings.category || card.category === settings.category),
  );
}
export const ROOM_CATEGORIES = [
  ...new Set(
    STARTER_DECK.map((card) => card.category).filter((value): value is string => Boolean(value)),
  ),
];

export function startRoom(
  state: LocalRoomState,
  dependencies: { random?: () => number; now: number },
): LocalRoomState {
  if (state.phase !== "lobby" || !state.participants.some((p) => p.online !== false)) return state;
  const pool = localRoomPool(state.settings, state.sourceDeck);
  if (!pool.length) return state;
  if (
    state.settings.subjectName === READY_LISTENING_SOURCE &&
    typeof state.settings.questionCount === "number" &&
    pool.length < state.settings.questionCount
  )
    return state;
  const deck =
    state.settings.activity === "bingo" && state.settings.bingoMode
      ? createListeningRound(pool, "all", dependencies.random)
      : state.settings.helenaWords === true
        ? createListeningRound(pool, state.settings.helenaWordCount ?? 10, dependencies.random)
        : state.settings.shuffle === false
          ? pool.slice(
              0,
              state.settings.questionCount === "all" ? undefined : state.settings.questionCount,
            )
          : createListeningRound(pool, state.settings.questionCount, dependencies.random);
  return {
    ...state,
    phase: "playing",
    deck,
    roundId: `${state.generation}:${(state.revision ?? 0) + 1}:${dependencies.now}`,
    questionIndex: 0,
    questionStartedAt:
      dependencies.now + (state.settings.activity === "bingo" ? 0 : ROOM_START_COUNTDOWN_MS),
    bingoDrawCount: state.settings.activity === "bingo" && state.settings.bingoMode ? 0 : undefined,
    bingoClaim: undefined,
    bingoClaimQueue: [],
    bingoWinnerIds: [],
    countdownStartedAt: state.settings.activity === "bingo" ? undefined : dependencies.now,
    answeredParticipantIds: [],
    feedbackUntil: undefined,
    receipts: Object.fromEntries(
      Object.entries(state.receipts ?? {}).filter(([key]) => !key.startsWith("answer:")),
    ),
    participants: state.participants.map((participant, index) => ({
      ...participant,
      ...(state.settings.teams
        ? {
            team: ROOM_TEAMS.includes(participant.team as RoomTeam)
              ? participant.team!
              : index % 2 === 0
                ? "Roxo"
                : "Amarelo",
          }
        : { team: "" }),
      score: 0,
      answersCount: 0,
      reward: undefined,
      lastAnswer: undefined,
      bingoMarks: [],
      bingoCard:
        state.settings.activity === "bingo" && state.settings.bingoPhysical
          ? []
          : state.settings.activity === "bingo" && state.settings.bingoMode
            ? createNumberBingoCard(dependencies.random)
            : createListeningRound(deck, Math.min(9, deck.length), dependencies.random).map(
                (card) => card.id,
              ),
    })),
    updatedAt: dependencies.now,
  };
}

export function submitRoomAnswer(
  state: LocalRoomState,
  dependencies: { participantId: string; questionIndex: number; answer: string; now: number },
): { state: LocalRoomState } & LocalRoomAnswerFeedback {
  if (state.settings.activity === "bingo" && state.settings.bingoMode) {
    const participant = state.participants.find((item) => item.id === dependencies.participantId);
    if (
      state.phase !== "playing" ||
      !participant ||
      state.bingoWinnerIds?.includes(participant.id) ||
      dependencies.questionIndex !== state.questionIndex
    )
      return { state, correct: false, pointsChange: 0 };
    const drawn = numberBingoDrawnIds(state);
    if (dependencies.answer === "bingo") {
      if (
        state.bingoClaim?.participantId === participant.id ||
        state.bingoClaimQueue?.some((claim) => claim.participantId === participant.id)
      )
        return { state, correct: true, pointsChange: 0 };
      if (
        state.bingoWinnerIds?.includes(participant.id) ||
        (state.bingoWinnerIds?.length ?? 0) >= 3 ||
        (state.bingoClaimQueue?.length ?? 0) >= MAX_ROOM_PARTICIPANTS
      )
        return { state, correct: false, pointsChange: 0 };
      const correct = state.settings.bingoPhysical
        ? drawn.length > 0
        : hasNumberBingo(
            participant.bingoCard ?? [],
            participant.bingoMarks ?? [],
            drawn,
            state.settings.bingoMode,
          );
      const claim: BingoClaim = {
        id: `${state.roundId}:${participant.id}:${(state.revision ?? 0) + 1}:${dependencies.now}`,
        participantId: participant.id,
        claimedAt: dependencies.now,
      };
      const claimed: LocalRoomState = {
        ...state,
        ...(state.bingoClaim
          ? { bingoClaimQueue: [...(state.bingoClaimQueue ?? []), claim] }
          : { bingoClaim: claim }),
        updatedAt: dependencies.now,
      };
      return {
        state: correct ? claimed : state,
        correct,
        pointsChange: 0,
      };
    }
    if (
      state.settings.bingoPhysical ||
      state.bingoClaim?.participantId === participant.id ||
      state.bingoClaimQueue?.some((claim) => claim.participantId === participant.id)
    )
      return { state, correct: false, pointsChange: 0 };
    const correct =
      drawn.includes(dependencies.answer) &&
      Boolean(participant.bingoCard?.includes(dependencies.answer));
    if (!correct || participant.bingoMarks?.includes(dependencies.answer))
      return { state, correct, pointsChange: 0 };
    const updated = {
      ...state,
      updatedAt: dependencies.now,
      participants: state.participants.map((item) =>
        item.id === participant.id
          ? {
              ...item,
              bingoMarks: [...(item.bingoMarks ?? []), dependencies.answer],
              score: item.score + BINGO_MARK_POINTS,
            }
          : item,
      ),
    };
    return { state: updated, correct: true, pointsChange: BINGO_MARK_POINTS };
  }
  const card = state.deck[dependencies.questionIndex];
  if (
    state.phase !== "playing" ||
    dependencies.questionIndex !== state.questionIndex ||
    !card ||
    dependencies.now < state.questionStartedAt ||
    dependencies.now >= state.questionStartedAt + state.settings.roundSeconds * 1000 ||
    state.answeredParticipantIds.includes(dependencies.participantId) ||
    !state.participants.some((item) => item.id === dependencies.participantId)
  ) {
    return { state, correct: false, pointsChange: 0 };
  }
  const correct =
    state.settings.activity === "bingo"
      ? dependencies.answer === card.id &&
        Boolean(
          state.participants
            .find((p) => p.id === dependencies.participantId)
            ?.bingoCard?.includes(card.id),
        )
      : isListeningAnswerCorrect(card, dependencies.answer, state.settings.acceptMinorTypos);
  const pointsChange = correct
    ? roomAnswerPoints(state.settings.roundSeconds, dependencies.now - state.questionStartedAt)
    : state.settings.activity !== "bingo"
      ? -WRONG_ANSWER_PENALTY_POINTS
      : 0;
  const participants = state.participants.map((participant) =>
    participant.id === dependencies.participantId
      ? {
          ...participant,
          score: Math.max(0, participant.score + pointsChange),
          answersCount: (participant.answersCount ?? 0) + 1,
          lastAnswer: { questionIndex: state.questionIndex, correct },
          ...(correct && state.settings.activity === "bingo"
            ? { bingoMarks: [...(participant.bingoMarks ?? []), card.id] }
            : {}),
        }
      : participant,
  );
  const answered: LocalRoomState = {
    ...state,
    participants,
    answeredParticipantIds: [...state.answeredParticipantIds, dependencies.participantId],
    updatedAt: dependencies.now,
  };
  const active = answered.participants.filter((participant) => participant.online !== false);
  const allAnswered =
    active.length > 0 &&
    active.every((participant) => answered.answeredParticipantIds.includes(participant.id));
  const bingo =
    state.settings.activity === "bingo" &&
    participants.some(
      (p) => p.bingoCard?.length && p.bingoCard.every((id) => p.bingoMarks?.includes(id)),
    );
  return {
    state: bingo
      ? completeRoom(answered, dependencies.now)
      : state.settings.activity === "bingo" && allAnswered
        ? advanceRoomQuestion(answered, dependencies.now)
        : allAnswered
          ? { ...answered, feedbackUntil: dependencies.now + ROOM_FEEDBACK_MS }
          : answered,
    correct,
    pointsChange,
    question: { front: card.front, back: card.back },
  };
}

// O feedback da escuta permanece visível por três segundos após a última resposta.
// Se ninguém concluiu a rodada, vale o limite de tempo da pergunta.
export function canAdvanceRoomQuestion(state: LocalRoomState, now: number): boolean {
  if (state.phase !== "playing") return false;
  if (state.settings.activity === "bingo" && state.settings.bingoMode) return false;
  if (state.feedbackUntil !== undefined) return now >= state.feedbackUntil;
  return now >= state.questionStartedAt + state.settings.roundSeconds * 1000;
}

export function roomSecondsLeft(state: PublicLocalRoomState, now: number): number {
  const duration = state.settings.roundSeconds * 1000;
  return Math.max(
    0,
    Math.min(
      state.settings.roundSeconds,
      Math.ceil((state.questionStartedAt + duration - now) / 1000),
    ),
  );
}

export function roomCountdownValue(state: PublicLocalRoomState, now: number): number | null {
  if (
    state.phase !== "playing" ||
    state.questionIndex !== 0 ||
    state.countdownStartedAt === undefined
  )
    return null;
  const remaining = state.questionStartedAt - now;
  if (remaining > 0) return Math.min(3, Math.ceil(remaining / 1000));
  return remaining > -400 ? 0 : null;
}

export function advanceRoomQuestion(state: LocalRoomState, now: number): LocalRoomState {
  if (state.phase !== "playing") return state;
  if (state.settings.activity === "bingo" && state.settings.bingoMode) {
    const count = state.bingoDrawCount ?? state.questionIndex + 1;
    if (state.bingoClaim || count >= state.deck.length) return state;
    return {
      ...state,
      bingoDrawCount: count + 1,
      questionIndex: count,
      questionStartedAt: now,
      updatedAt: now,
    };
  }
  const nextIndex = state.questionIndex + 1;
  if (nextIndex >= state.deck.length) {
    return completeRoom(state, now);
  }
  return {
    ...state,
    questionIndex: nextIndex,
    questionStartedAt: now,
    countdownStartedAt: undefined,
    answeredParticipantIds: [],
    feedbackUntil: undefined,
    updatedAt: now,
  };
}

export function returnRoomToLobby(state: LocalRoomState, now: number): LocalRoomState {
  if (state.phase !== "results") return state;
  return {
    ...state,
    phase: "lobby",
    deck: [],
    questionIndex: 0,
    questionStartedAt: now,
    countdownStartedAt: undefined,
    answeredParticipantIds: [],
    feedbackUntil: undefined,
    updatedAt: now,
  };
}

export function repeatRoom(
  state: LocalRoomState,
  dependencies: { random?: () => number; now: number },
): LocalRoomState {
  return startRoom(returnRoomToLobby(state, dependencies.now), dependencies);
}

// O índice de pergunta continua compatível com salas abertas antes da contagem explícita.
export function numberBingoDrawnIds(state: LocalRoomState): string[] {
  return state.deck
    .slice(0, state.bingoDrawCount ?? state.questionIndex + 1)
    .map((item) => item.id);
}

export function reviewNumberBingo(
  state: LocalRoomState,
  claimId: string,
  decision: BingoReviewDecision,
  now: number,
): LocalRoomState {
  const claim = state.bingoClaim;
  if (
    state.phase !== "playing" ||
    state.settings.activity !== "bingo" ||
    !state.settings.bingoMode ||
    !claim ||
    claim.id !== claimId ||
    (state.bingoWinnerIds?.length ?? 0) >= 3
  )
    return state;
  if (decision === "restart") return startRoom({ ...state, phase: "lobby" }, { now });
  const participant = state.participants.find((p) => p.id === claim.participantId);
  if (
    (decision === "continue" || decision === "finish") &&
    (!participant ||
      (!state.settings.bingoPhysical &&
        !hasNumberBingo(
          participant.bingoCard ?? [],
          participant.bingoMarks ?? [],
          numberBingoDrawnIds(state),
          state.settings.bingoMode,
        )))
  )
    return state;
  const reviewed: LocalRoomState = {
    ...state,
    bingoClaim: decision === "finish" ? undefined : state.bingoClaimQueue?.[0],
    bingoClaimQueue: decision === "finish" ? [] : (state.bingoClaimQueue ?? []).slice(1),
    bingoWinnerIds:
      decision === "continue" || decision === "finish"
        ? [...new Set([...(state.bingoWinnerIds ?? []), claim.participantId])]
        : (state.bingoWinnerIds ?? []),
    participants: state.participants.map((p) =>
      (decision === "continue" || decision === "finish") && p.id === claim.participantId
        ? { ...p, score: p.score + BINGO_OBJECTIVE_POINTS[state.settings.bingoMode!] }
        : p,
    ),
    receipts: Object.fromEntries(
      Object.entries(state.receipts ?? {}).filter(
        ([key]) => !(key.startsWith(`answer:${claim.participantId}:`) && key.endsWith(":bingo")),
      ),
    ),
    updatedAt: now,
  };
  return decision === "finish" || reviewed.bingoWinnerIds!.length >= 3
    ? finishNumberBingo({ ...reviewed, bingoClaim: undefined, bingoClaimQueue: [] }, now)
    : reviewed;
}

export function finishNumberBingo(state: LocalRoomState, now: number): LocalRoomState {
  if (
    state.phase !== "playing" ||
    state.settings.activity !== "bingo" ||
    !state.settings.bingoMode ||
    state.bingoClaim ||
    !state.bingoWinnerIds?.length
  )
    return state;
  const winners = new Set(state.bingoWinnerIds);
  return {
    ...state,
    phase: "results",
    updatedAt: now,
    participants: state.participants.map((p) =>
      winners.has(p.id)
        ? {
            ...p,
            reward: {
              id: `${state.code}:${state.generation}:${state.roundId}:${p.id}`,
              place: state.bingoWinnerIds!.indexOf(p.id) + 1,
              xp: roomEffortXp(p.score, "bingo"),
              completedAt: now,
            },
          }
        : p,
    ),
  };
}

export function endRoom(state: LocalRoomState, now: number): LocalRoomState {
  if (state.phase === "finished") return state;
  return { ...state, phase: "finished", updatedAt: now };
}

export function rankLocalRoomParticipants(
  participants: readonly LocalRoomParticipant[],
): LocalRoomParticipant[] {
  return [...participants].sort((a, b) => b.score - a.score);
}

export function toPublicRoomState(state: LocalRoomState): PublicLocalRoomState {
  const card = state.deck[state.questionIndex];
  return {
    code: state.code,
    phase: state.phase,
    settings: state.settings,
    participants: state.participants.map((participant) => {
      const publicParticipant = { ...participant };
      delete publicParticipant.token;
      delete publicParticipant.accountId;
      return publicParticipant;
    }),
    questionIndex: state.questionIndex,
    ...(state.settings.activity === "bingo" && state.settings.bingoMode && state.roundId
      ? { roundId: state.roundId }
      : {}),
    ...(state.bingoDrawCount === undefined ? {} : { bingoDrawCount: state.bingoDrawCount }),
    ...(state.bingoClaim ? { bingoClaim: state.bingoClaim } : {}),
    ...(state.bingoClaimQueue ? { bingoClaimQueue: state.bingoClaimQueue } : {}),
    ...(state.bingoWinnerIds ? { bingoWinnerIds: state.bingoWinnerIds } : {}),
    questionStartedAt: state.questionStartedAt,
    ...(state.countdownStartedAt === undefined
      ? {}
      : { countdownStartedAt: state.countdownStartedAt }),
    totalQuestions: state.deck.length,
    answeredParticipantIds: state.answeredParticipantIds,
    ...(state.feedbackUntil === undefined ? {} : { feedbackUntil: state.feedbackUntil }),
    ...(state.revision === undefined ? {} : { revision: state.revision }),
    ...(state.expiresAt === undefined ? {} : { expiresAt: state.expiresAt }),
    ...(state.generation === undefined ? {} : { generation: state.generation }),
    content: {
      count: localRoomPool(state.settings, state.sourceDeck).length,
      difficultyCounts: {
        mixed: localRoomPool({ ...state.settings, difficulty: "mixed" }, state.sourceDeck).length,
        easy: localRoomPool({ ...state.settings, difficulty: "easy" }, state.sourceDeck).length,
        medium: localRoomPool({ ...state.settings, difficulty: "medium" }, state.sourceDeck).length,
        hard: localRoomPool({ ...state.settings, difficulty: "hard" }, state.sourceDeck).length,
      },
      preview: (state.settings.helenaWords === true
        ? []
        : localRoomPool(state.settings, state.sourceDeck)
      )
        .slice(0, 3)
        .map((item) => item.front),
    },
    ...(state.settings.activity === "bingo"
      ? {
          ...(state.settings.bingoMode
            ? {}
            : { bingoWords: state.deck.map((item) => ({ id: item.id, text: item.back })) }),
          drawnIds: state.settings.bingoMode
            ? numberBingoDrawnIds(state)
            : state.deck.slice(0, state.questionIndex + 1).map((item) => item.id),
        }
      : {}),
    ...(state.phase === "playing" && card && state.bingoDrawCount !== 0
      ? { currentQuestion: { id: card.id, front: card.front } }
      : {}),
  };
}
