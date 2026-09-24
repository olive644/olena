import {
  createListeningRound,
  isListeningAnswerCorrect,
  STARTER_DECK,
  type ListeningCard,
} from "./listening-quiz.js";

export type LocalRoomPhase = "lobby" | "playing" | "results" | "finished";

export type LocalRoomDifficulty = "mixed" | "easy" | "medium" | "hard";

export type LocalRoomRoundSeconds = 15 | 30 | 45 | 60;

export type LocalRoomSettings = {
  difficulty: LocalRoomDifficulty;
  questionCount: 5 | 10 | 15 | "all";
  roundSeconds: LocalRoomRoundSeconds;
  activity?: "listening" | "bingo";
  category?: string;
  shuffle?: boolean;
  teams?: boolean;
  allowLateJoin?: boolean;
  subjectName?: string;
  audioRate?: 0.75 | 1;
  audioRepetitions?: 1 | 2 | 3 | "unlimited";
  autoPlayAudio?: boolean;
  acceptMinorTypos?: boolean;
};

export type LocalRoomParticipant = {
  id: string;
  displayName: string;
  score: number;
  token?: string;
  lastSeenAt?: number;
  online?: boolean;
  team?: string;
  bingoMarks?: string[];
  bingoCard?: string[];
};

export type LocalRoomQuestion = { id: string; front: string };

export type LocalRoomAnswerFeedback = {
  correct: boolean;
  xpChange: number;
  question?: { front: string; back: string };
};

export type LocalRoomState = {
  code: string;
  hostToken: string;
  phase: LocalRoomPhase;
  settings: LocalRoomSettings;
  participants: LocalRoomParticipant[];
  deck: ListeningCard[];
  questionIndex: number;
  questionStartedAt: number;
  answeredParticipantIds: string[];
  createdAt: number;
  updatedAt: number;
  revision?: number;
  hostLastSeenAt?: number;
  expiresAt?: number;
  receipts?: Record<
    string,
    {
      correct?: boolean;
      xpChange?: number;
      question?: { front: string; back: string };
      participantId?: string;
      participantToken?: string;
    }
  >;
  createRequestId?: string;
  generation?: string;
  sourceDeck?: ListeningCard[];
};

export type PublicLocalRoomState = {
  code: string;
  phase: LocalRoomPhase;
  settings: LocalRoomSettings;
  participants: LocalRoomParticipant[];
  questionIndex: number;
  questionStartedAt: number;
  totalQuestions: number;
  currentQuestion?: LocalRoomQuestion;
  answeredParticipantIds: string[];
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

// Quanto vale acertar, e quanto quem está na liderança perde ao errar. Dá
// um motivo real pra quem está na frente continuar prestando atenção, em
// vez de só acumular pontos sem risco.
export const CORRECT_ANSWER_XP = 10;
export const LEADER_WRONG_ANSWER_PENALTY_XP = 5;

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
  dependencies: { code: string; hostToken: string; now: number },
): LocalRoomState {
  return {
    code: dependencies.code,
    hostToken: dependencies.hostToken,
    phase: "lobby",
    settings,
    participants: [],
    deck: [],
    questionIndex: 0,
    questionStartedAt: dependencies.now,
    answeredParticipantIds: [],
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
    (state.phase !== "lobby" && !(state.phase === "playing" && state.settings.allowLateJoin)) ||
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
  return { ...state, settings: { ...state.settings, ...settings }, updatedAt: now };
}

export function localRoomPool(
  settings: LocalRoomSettings,
  source: readonly ListeningCard[] = STARTER_DECK,
): readonly ListeningCard[] {
  return source.filter(
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
  if (state.phase !== "lobby" || state.participants.length === 0) return state;
  const pool = localRoomPool(state.settings, state.sourceDeck);
  if (!pool.length) return state;
  const deck =
    state.settings.shuffle === false
      ? pool.slice(
          0,
          state.settings.questionCount === "all" ? undefined : state.settings.questionCount,
        )
      : createListeningRound(pool, state.settings.questionCount, dependencies.random);
  return {
    ...state,
    phase: "playing",
    deck,
    questionIndex: 0,
    questionStartedAt: dependencies.now,
    answeredParticipantIds: [],
    receipts: Object.fromEntries(
      Object.entries(state.receipts ?? {}).filter(([key]) => !key.startsWith("answer:")),
    ),
    participants: state.participants.map((participant, index) => ({
      ...participant,
      ...(state.settings.teams ? { team: index % 2 === 0 ? "Roxo" : "Amarelo" } : { team: "" }),
      score: 0,
      bingoMarks: [],
      bingoCard: createListeningRound(deck, Math.min(9, deck.length), dependencies.random).map(
        (card) => card.id,
      ),
    })),
    updatedAt: dependencies.now,
  };
}

function isLeading(participants: readonly LocalRoomParticipant[], participantId: string): boolean {
  const top = Math.max(...participants.map((item) => item.score));
  if (top <= 0) return false;
  const leader = participants.find((item) => item.id === participantId);
  return leader?.score === top;
}

export function submitRoomAnswer(
  state: LocalRoomState,
  dependencies: { participantId: string; questionIndex: number; answer: string; now: number },
): { state: LocalRoomState } & LocalRoomAnswerFeedback {
  const card = state.deck[dependencies.questionIndex];
  if (
    state.phase !== "playing" ||
    dependencies.questionIndex !== state.questionIndex ||
    !card ||
    dependencies.now >= state.questionStartedAt + state.settings.roundSeconds * 1000 ||
    state.answeredParticipantIds.includes(dependencies.participantId) ||
    !state.participants.some((item) => item.id === dependencies.participantId)
  ) {
    return { state, correct: false, xpChange: 0 };
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
  const wasLeading =
    state.settings.activity !== "bingo" &&
    !correct &&
    isLeading(state.participants, dependencies.participantId);
  const xpChange = correct ? CORRECT_ANSWER_XP : wasLeading ? -LEADER_WRONG_ANSWER_PENALTY_XP : 0;
  const participants = state.participants.map((participant) =>
    participant.id === dependencies.participantId
      ? {
          ...participant,
          score: Math.max(0, participant.score + xpChange),
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
      ? { ...answered, phase: "results" }
      : state.settings.activity === "bingo" && allAnswered
        ? advanceRoomQuestion(answered, dependencies.now)
        : answered,
    correct,
    xpChange,
    question: { front: card.front, back: card.back },
  };
}

// A pergunta permanece visível por alguns instantes após a última resposta.
// O organizador pode avançar quando todos responderem ou quando o tempo acabar.
export function canAdvanceRoomQuestion(state: LocalRoomState, now: number): boolean {
  if (state.phase !== "playing") return false;
  const activeParticipants = state.participants.filter(
    (participant) => participant.online !== false,
  );
  if (
    activeParticipants.length > 0 &&
    activeParticipants.every((participant) => state.answeredParticipantIds.includes(participant.id))
  )
    return true;
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

export function advanceRoomQuestion(state: LocalRoomState, now: number): LocalRoomState {
  if (state.phase !== "playing") return state;
  const nextIndex = state.questionIndex + 1;
  if (nextIndex >= state.deck.length) {
    return { ...state, phase: "results", updatedAt: now };
  }
  return {
    ...state,
    questionIndex: nextIndex,
    questionStartedAt: now,
    answeredParticipantIds: [],
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
    answeredParticipantIds: [],
    updatedAt: now,
  };
}

export function repeatRoom(
  state: LocalRoomState,
  dependencies: { random?: () => number; now: number },
): LocalRoomState {
  return startRoom(returnRoomToLobby(state, dependencies.now), dependencies);
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
      return publicParticipant;
    }),
    questionIndex: state.questionIndex,
    questionStartedAt: state.questionStartedAt,
    totalQuestions: state.deck.length,
    answeredParticipantIds: state.answeredParticipantIds,
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
      preview: localRoomPool(state.settings, state.sourceDeck)
        .slice(0, 3)
        .map((item) => item.front),
    },
    ...(state.settings.activity === "bingo"
      ? {
          bingoWords: state.deck.map((item) => ({ id: item.id, text: item.back })),
          drawnIds: state.deck.slice(0, state.questionIndex + 1).map((item) => item.id),
        }
      : {}),
    ...(state.phase === "playing" && card
      ? { currentQuestion: { id: card.id, front: card.front } }
      : {}),
  };
}
