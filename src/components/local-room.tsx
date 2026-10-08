import {
  RoomAudioIcon,
  RoomPointsIcon,
  RoomClockIcon,
  RoomConfetti,
  RoomSecondsUnit,
} from "./room-paper-icons";
import {
  GUEST_NAME,
  GUEST_NICKNAME_MAX,
  normalizeGuestNickname,
  readGuestNickname,
  writeGuestNickname,
} from "../domain/guest-session";
import {
  playRoomFeedbackSound,
  prepareRoomFeedbackSound,
  playRoomCountdownSound,
} from "../data/room-feedback-sound";
import { PaperMoonMark } from "./paper-moon-mark";
import { RoomAnswerHelena, RoomSpeedNotice } from "./room-answer-helena";
import { PaperDigits } from "./paper-digits";
import { PaperArrow } from "./paper-arrow";
import { RoomRewardNotice } from "./room-reward-notice";
import { BingoWinners } from "./bingo-winners";
import { RoomTeamBoard } from "./room-team-board";
import { useEffect, useRef, useState, lazy, Suspense, type FormEvent } from "react";
import {
  isValidLocalRoomCode,
  MAX_ROOM_PARTICIPANTS,
  normalizeLocalRoomCode,
  sanitizeRoomAvatar,
  localRoomPool,
  roomSecondsLeft,
  roomCountdownValue,
  ROOM_FEEDBACK_MS,
  ROOM_TEAMS,
  ROOM_TEAM_LABELS,
  type LocalRoomAnswerFeedback,
  ROOM_CATEGORIES,
  type LocalRoomSettings,
  type PublicLocalRoomState,
} from "../domain/local-room";
import { normalizeListeningAnswer, parseManualListeningInput } from "../domain/listening-quiz";
import {
  READY_LISTENING_DECK,
  READY_LISTENING_SOURCE,
  searchReadyListeningWords,
} from "../domain/ready-listening-words";
import { roomAppCheckToken } from "../data/room-app-check";
import { uploadRoomRecording } from "../data/room-recording";
import type { ListeningCard } from "../domain/listening-quiz";
import { NaturalVoicePlayer, type NaturalVoiceState } from "../data/listening-audio";
import { RecordedRoomPlayer } from "../data/recorded-room-player";
import { useListeningOnline } from "../hooks/use-listening-online";
import { ListeningOnlineNotice } from "./listening-online-notice";
import { LOCAL_ROOM_SESSION_KEY, useLocalRoom } from "../hooks/use-local-room";
import { PaperEditorIcon } from "./paper-editor-icon";
import { PaperActionIcon } from "./paper-action-icon";
import { HelenaLoading } from "./helena-loading";
import { NavigationIcon } from "./navigation-icon";
import { HelenaRoomIcon } from "./helena-room-icon";
import { LobbyParticipants, ShareRoom } from "./local-room-lobby-presentation";
import { RoomPresenceEffects } from "./room-presence-effects";
import { RoomRecordingInput } from "./room-recording-input";
import { RoomConfirmButton } from "./room-confirm-button";
import { RoomExpiryNotice } from "./room-expiry-notice";
import { PaperEnglishWord } from "./paper-english-word";
import { PaperCheckIcon } from "./paper-check-icon";
import { Podium, ProjectorRoom, Scoreboard } from "./local-room-projector";
import {
  AUDIO_REPLAY_COOLDOWN_MS,
  countLabel,
  DEFAULT_SETTINGS,
  HELENA_WORD_STEPS,
  MANUAL_LISTENING_SOURCE,
  ROOM_ACTIVITY_OPTIONS,
  TIME_STEPS,
} from "./local-room-config";
import { CountdownOverlay, LocalRoomFullscreen, RoomStepSlider } from "./local-room-parts";

const RoomQrScanner = lazy(() => import("./room-qr-scanner"));
const NumberBingo = lazy(() => import("./number-bingo"));

type LocalRoomProps = {
  initialJoinCode?: string | undefined;
  projectorMode?: boolean;
  onExit?: () => void;
  onSignIn?: () => void;
  accountName?: string | undefined;
  guest?: boolean;
  accountLoading?: boolean;
  requireAccount?: boolean;
};

export function LocalRoom({
  initialJoinCode,
  projectorMode = false,
  onExit,
  onSignIn,
  accountName,
  guest = false,
  accountLoading = false,
  requireAccount = false,
}: LocalRoomProps) {
  const connection = useLocalRoom(initialJoinCode);
  useEffect(() => {
    for (const result of ["correct", "wrong"]) {
      const sprite = new Image();
      sprite.src = `/room-art/helena-${result}-frames.webp`;
    }
  }, []);
  const preparing = connection.role === "choose" && !connection.isRestoring;
  const [draftSettings, setDraftSettings] = useState(DEFAULT_SETTINGS);
  const [selectedActivity, setSelectedActivity] = useState<"listening" | "bingo" | null>(null);
  const [scanningQr, setScanningQr] = useState(false);
  const [activitiesExpanded, setActivitiesExpanded] = useState(true);
  const [browsingRoom, setBrowsingRoom] = useState(false);
  const modalitiesButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selectedActivity) modalitiesButton.current?.focus();
  }, [selectedActivity]);
  const [readyDraftIds, setReadyDraftIds] = useState<string[]>([]);
  const [removingReadyIds, setRemovingReadyIds] = useState<string[]>([]);
  const removalTimers = useRef<Set<number>>(new Set());
  useEffect(() => {
    const timers = removalTimers.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, []);
  function removeReadyWords(ids: string[]) {
    setRemovingReadyIds((current) => [...new Set([...current, ...ids])]);
    setReadyDraftIds((current) => current.filter((id) => !ids.includes(id)));
    const timer = window.setTimeout(() => {
      setRemovingReadyIds((current) => current.filter((id) => !ids.includes(id)));
      removalTimers.current.delete(timer);
    }, 220);
    removalTimers.current.add(timer);
  }
  const [draftDeck, setDraftDeck] = useState<ListeningCard[]>([]);
  const [creating, setCreating] = useState(false);
  const [creationError, setCreationError] = useState("");
  const draftState: PublicLocalRoomState = {
    code: "",
    phase: "lobby",
    settings: { ...draftSettings, readyWordIds: readyDraftIds },
    participants: [],
    questionIndex: 0,
    questionStartedAt: 0,
    totalQuestions: 0,
    answeredParticipantIds: [],
  };
  const room = {
    ...connection,
    state: preparing ? draftState : connection.state,
    isHost: preparing || connection.isHost,
    hostDeck: preparing ? draftDeck : connection.hostDeck,
    updateSettings: async (settings: Partial<LocalRoomSettings>, sourceDeck?: ListeningCard[]) => {
      if (!preparing) return connection.updateSettings(settings, sourceDeck);
      setDraftSettings((current) => ({ ...current, ...settings }));
      if (sourceDeck) setDraftDeck(sourceDeck);
      return true;
    },
  };
  const serverNow = room.serverNow;
  const speechCredential = room.speechCredential;
  const [profile] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}") as {
        name?: unknown;
        photoUrl?: unknown;
      };
      return {
        name: typeof stored.name === "string" ? stored.name : "",
        avatarUrl: sanitizeRoomAvatar(stored.photoUrl),
      };
    } catch {
      return { name: "", avatarUrl: undefined };
    }
  });
  const [accountLevel] = useState(() => {
    try {
      const value = Number(localStorage.getItem("helena.soloProgress"));
      return Number.isInteger(value) && value >= 1 ? Math.min(4, value) : 1;
    } catch {
      return 1;
    }
  });
  const [code, setCode] = useState(initialJoinCode ?? "");
  const [guestNickname, setGuestNickname] = useState(() => readGuestNickname());
  const isGuest = guest && !accountName?.trim();
  const name = isGuest
    ? normalizeGuestNickname(guestNickname) || GUEST_NAME
    : accountName?.trim() || (!requireAccount ? profile.name : "");
  const nicknameField = isGuest ? (
    <div className="local-room-nickname">
      <label htmlFor="local-room-nickname-input">Seu apelido na sala</label>
      <input
        id="local-room-nickname-input"
        value={guestNickname}
        maxLength={GUEST_NICKNAME_MAX}
        autoComplete="nickname"
        placeholder={GUEST_NAME}
        aria-describedby="local-room-nickname-help"
        onChange={(event) => {
          setGuestNickname(event.target.value);
          writeGuestNickname(event.target.value);
        }}
      />
      <small id="local-room-nickname-help">
        Vale só aqui na sala. No resto do app você continua como {GUEST_NAME}.
      </small>
    </div>
  ) : null;
  const [pendingActivity, setPendingActivity] = useState<"listening" | "bingo" | null>(null);
  const activityRequestRef = useRef(false);
  const [manualRows, setManualRows] = useState<
    {
      id: string;
      word: string;
      translation: string;
      audioId?: string;
      audioFile?: Blob;
      pendingAudio?: boolean;
    }[]
  >([{ id: "first", word: "", translation: "" }]);
  const manualWords = manualRows
    .map((row) =>
      row.word.trim() || row.translation.trim() || row.audioId || row.pendingAudio
        ? `${row.word}\t${row.translation}`
        : "",
    )
    .join("\n");
  const recordingIds = Object.fromEntries(
    manualRows.flatMap((row) =>
      row.audioId || (preparing && row.audioFile)
        ? [[normalizeListeningAnswer(row.word), row.audioId ?? row.id]]
        : [],
    ),
  );
  const [appliedManualWords, setAppliedManualWords] = useState("");
  const [appliedRecordingSignature, setAppliedRecordingSignature] = useState("");
  const restoredRoomCodeRef = useRef("");
  const authoringRoomCodeRef = useRef<string | undefined>(undefined);
  const [manualApplyStatus, setManualApplyStatus] = useState("");
  const [readySearch, setReadySearch] = useState("");
  const [readyWordsOpen, setReadyWordsOpen] = useState(false);
  const [readyApplying, setReadyApplying] = useState(false);
  const readyAppliedRef = useRef("");
  const [revealHostWord, setRevealHostWord] = useState(false);
  const [confirmRevealHostWord, setConfirmRevealHostWord] = useState(false);
  const [markPending, setMarkPending] = useState(false);
  const [markFeedback, setMarkFeedback] = useState("");
  const [answer, setAnswer] = useState("");
  const answerInputRef = useRef<HTMLInputElement>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [lastResult, setLastResult] = useState<
    (LocalRoomAnswerFeedback & { submittedAnswer: string }) | undefined
  >(undefined);
  const state =
    room.state && pendingActivity
      ? { ...room.state, settings: { ...room.state.settings, activity: pendingActivity } }
      : room.state;
  const [naturalState, setNaturalState] = useState<NaturalVoiceState>({ status: "idle" });
  const naturalPlayerRef = useRef<NaturalVoicePlayer | undefined>(undefined);
  const recordedPlayerRef = useRef<RecordedRoomPlayer | undefined>(undefined);
  const autoPlayedQuestionRef = useRef<string | undefined>(undefined);
  const [replayCooldownUntil, setReplayCooldownUntil] = useState(0);
  const [replayCooldownSeconds, setReplayCooldownSeconds] = useState(0);

  const online = useListeningOnline();
  const isAllowed = online.isAllowed;
  const roomCodeRef = useRef(state?.code);
  useEffect(() => {
    document.querySelector(".local-room-fullscreen")?.scrollTo?.({ top: 0, behavior: "instant" });
  }, [state?.phase]);
  useEffect(() => {
    roomCodeRef.current = state?.code;
  }, [state?.code]);

  useEffect(() => {
    // O texto das frases só vai à empresa de voz se a pessoa tiver aceitado neste aparelho.
    const player = new NaturalVoicePlayer(
      setNaturalState,
      isAllowed,
      () => roomCodeRef.current,
      speechCredential,
    );
    naturalPlayerRef.current = player;
    return () => player.dispose();
  }, [isAllowed, speechCredential]);

  useEffect(() => {
    const player = new RecordedRoomPlayer(setNaturalState, () => {
      const code = roomCodeRef.current;
      const credential = speechCredential();
      return code && credential ? { code, credential } : undefined;
    });
    recordedPlayerRef.current = player;
    return () => player.dispose();
  }, [speechCredential]);

  function playQuestionAudio(text: string) {
    if (!state || state.phase !== "playing" || room.serverNow() < state.questionStartedAt) return;
    const playback =
      (state?.settings.activity ?? "listening") === "listening"
        ? state?.settings.subjectName === READY_LISTENING_SOURCE && state.currentQuestion
          ? recordedPlayerRef.current?.generate(state.questionIndex, state.currentQuestion.id)
          : recordedPlayerRef.current?.generate(state?.questionIndex ?? 0)
        : naturalPlayerRef.current?.generate(text, 1);
    void playback;
  }

  function replayQuestionAudio(text: string) {
    if (!state || state.phase !== "playing" || room.serverNow() < state.questionStartedAt) return;
    if (room.serverNow() < replayCooldownUntil) return;
    playQuestionAudio(text);
    const cooldownUntil = room.serverNow() + AUDIO_REPLAY_COOLDOWN_MS;
    setReplayCooldownUntil(cooldownUntil);
    setReplayCooldownSeconds(5);
  }

  const [appliedJoinCode, setAppliedJoinCode] = useState(false);
  if (initialJoinCode && !appliedJoinCode && room.role === "choose") {
    setAppliedJoinCode(true);
    room.setRole("participant");
  }

  const questionKey = state ? `${state.phase}-${state.questionIndex}` : undefined;
  const [seenQuestionKey, setSeenQuestionKey] = useState(questionKey);
  if (questionKey !== seenQuestionKey) {
    setSeenQuestionKey(questionKey);
    setAnswer("");
    setLastResult(undefined);
    setRevealHostWord(false);
    setConfirmRevealHostWord(false);
    setIsSubmittingAnswer(false);
    setReplayCooldownUntil(0);
    setReplayCooldownSeconds(0);
  }

  const currentQuestionFront = state?.currentQuestion?.front;
  const currentQuestionId = state?.currentQuestion?.id;
  useEffect(() => {
    // Uma pergunta nova nao deve tocar a reproducao (ou pedido de audio) da
    // pergunta anterior por cima; ja aproveita pra pedir o audio dela com
    // antecedencia, antes de alguem clicar em "Ouvir".
    naturalPlayerRef.current?.stop();
    recordedPlayerRef.current?.stop();
    if (currentQuestionFront) {
      if ((state?.settings.activity ?? "listening") === "listening") {
        if (state?.settings.subjectName === READY_LISTENING_SOURCE && currentQuestionId)
          recordedPlayerRef.current?.preload(state.questionIndex, currentQuestionId);
        else recordedPlayerRef.current?.preload(state?.questionIndex ?? 0);
      } else naturalPlayerRef.current?.preload(currentQuestionFront, 1);
    }
  }, [
    questionKey,
    currentQuestionFront,
    state?.settings.activity,
    state?.questionIndex,
    state?.settings.subjectName,
    currentQuestionId,
  ]);

  const participantCount = state?.participants.length ?? 0;
  const canJoin = !room.busy && !accountLoading && isValidLocalRoomCode(code) && name.length > 0;

  const isPlaying = state?.phase === "playing";
  const questionStartedAt = state?.questionStartedAt ?? 0;
  const roundSeconds = state?.settings.roundSeconds ?? 30;
  const [clockNow, setClockNow] = useState(() => serverNow());
  const countdownValue = state ? roomCountdownValue(state, clockNow) : null;
  const roundAudioLocked = isPlaying && clockNow < questionStartedAt;
  const [secondsLeft, setSecondsLeft] = useState(() =>
    state ? roomSecondsLeft(state, serverNow()) : roundSeconds,
  );
  const [feedbackMsLeft, setFeedbackMsLeft] = useState(() =>
    Math.max(0, (state?.feedbackUntil ?? 0) - serverNow()),
  );
  const lastCueRef = useRef("");
  useEffect(() => {
    if (
      browsingRoom ||
      !isPlaying ||
      projectorMode ||
      (state?.settings.activity === "bingo" && state.settings.bingoMode && countdownValue === null)
    )
      return;
    const opening = countdownValue !== null;
    if (!opening && (secondsLeft < 1 || secondsLeft > 3 || state?.feedbackUntil !== undefined))
      return;
    const value = opening ? countdownValue : secondsLeft;
    const key = `${questionStartedAt}/${opening ? "start" : "warning"}/${value}`;
    if (lastCueRef.current === key) return;
    lastCueRef.current = key;
    playRoomCountdownSound(value, !opening);
  }, [
    browsingRoom,
    countdownValue,
    secondsLeft,
    questionStartedAt,
    isPlaying,
    projectorMode,
    state?.feedbackUntil,
    state?.settings.activity,
    state?.settings.bingoMode,
  ]);

  useEffect(() => {
    if (
      browsingRoom ||
      !currentQuestionFront ||
      (state?.settings.activity === "bingo" && state.settings.bingoMode) ||
      state?.phase !== "playing" ||
      projectorMode ||
      (!room.isHost && !room.isOrganizer && state.settings.participantAudio !== true)
    )
      return;
    if (clockNow < state.questionStartedAt || autoPlayedQuestionRef.current === questionKey) return;
    autoPlayedQuestionRef.current = questionKey;
    playQuestionAudio(currentQuestionFront);
    // O horário do servidor, não a animação local, libera o áudio da rodada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clockNow,
    browsingRoom,
    currentQuestionFront,
    projectorMode,
    questionKey,
    state?.phase,
    state?.settings.participantAudio,
    room.isHost,
    room.isOrganizer,
  ]);

  useEffect(() => {
    if (!replayCooldownUntil) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((replayCooldownUntil - serverNow()) / 1000));
      setReplayCooldownSeconds(remaining);
      if (!remaining) setReplayCooldownUntil(0);
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [replayCooldownUntil, serverNow]);

  useEffect(() => {
    const deadline = state?.feedbackUntil;
    if (deadline === undefined) return;
    const update = () => setFeedbackMsLeft(Math.max(0, deadline - serverNow()));
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [state?.feedbackUntil, serverNow]);

  // Só o navegador do organizador tenta avançar quando o tempo acaba.
  // O intervalo curto também corrige pequenas diferenças entre relógios.
  useEffect(() => {
    if (!isPlaying) return;
    let advancing = false;
    const tick = () => {
      const now = room.serverNow();
      setClockNow(now);
      if (state?.settings.activity === "bingo" && state.settings.bingoMode) return;
      const remaining = state ? roomSecondsLeft(state, now) : 0;
      setSecondsLeft(remaining);
      if (
        remaining === 0 &&
        room.isOrganizer &&
        !projectorMode &&
        state?.feedbackUntil === undefined &&
        !advancing
      ) {
        advancing = true;
        void room.nextQuestion().finally(() => {
          advancing = false;
        });
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, projectorMode, questionStartedAt, roundSeconds, room.isOrganizer, state]);

  useEffect(() => {
    if (!isPlaying || !room.isOrganizer || projectorMode || !state?.feedbackUntil) return;
    const timer = window.setTimeout(
      () => void room.nextQuestion(),
      Math.max(0, state.feedbackUntil - room.serverNow()),
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, projectorMode, questionStartedAt, room.isOrganizer, state?.feedbackUntil]);

  function joinRoom(event: FormEvent) {
    event.preventDefault();
    prepareRoomFeedbackSound();
    recordedPlayerRef.current?.unlock();
    void room.joinRoom(code, name, profile.avatarUrl, isGuest ? 1 : accountLevel);
  }

  async function submitAnswer(event: FormEvent) {
    event.preventDefault();
    if (
      !state?.currentQuestion ||
      !answer.trim() ||
      isSubmittingAnswer ||
      room.serverNow() < state.questionStartedAt
    )
      return;
    setIsSubmittingAnswer(true);
    const feedbackAudio = prepareRoomFeedbackSound();
    const submittedAnswer = answer.trim();
    try {
      const result = await room.submitAnswer(state.questionIndex, submittedAnswer);
      if (result) {
        setLastResult({ ...result, submittedAnswer });
        playRoomFeedbackSound(result.correct, feedbackAudio);
      } else if (feedbackAudio) void feedbackAudio.close();
    } finally {
      setIsSubmittingAnswer(false);
    }
  }

  function openProjector() {
    const projector = window.open("", "_blank");
    if (!projector) return;
    try {
      const session = window.sessionStorage.getItem(LOCAL_ROOM_SESSION_KEY);
      if (session) projector.sessionStorage.setItem(LOCAL_ROOM_SESSION_KEY, session);
      projector.opener = null;
      projector.location.href = `/sala/${state?.code ?? ""}/projetor`;
    } catch {
      projector.close();
    }
  }

  async function markBingoWord(questionIndex: number, id: string) {
    if (markPending) return;
    setMarkPending(true);
    const result = await room.submitAnswer(questionIndex, id);
    setMarkPending(false);
    setMarkFeedback(
      !result
        ? ""
        : id === "pass"
          ? "Resposta enviada."
          : result.correct
            ? "Marcado!"
            : "Essa palavra não foi a sorteada.",
    );
  }

  function exitRoom() {
    room.reset();
    onExit?.();
  }

  function backToModalities() {
    naturalPlayerRef.current?.stop();
    recordedPlayerRef.current?.stop();
    setBrowsingRoom(true);
    setSelectedActivity(null);
    setActivitiesExpanded(true);
    setAppliedJoinCode(true);
  }

  function prepareRoomProtection() {
    void roomAppCheckToken().catch(() => undefined);
  }

  useEffect(() => {
    // Verifica o dispositivo enquanto o usuário escolhe a atividade ou digita o código.
    prepareRoomProtection();
  }, []);

  async function selectActivity(activity: "listening" | "bingo") {
    if (activityRequestRef.current) return;
    if (selectedActivity === activity && preparing) {
      setActivitiesExpanded(false);
      modalitiesButton.current?.focus();
      return;
    }
    setSelectedActivity(activity);
    setActivitiesExpanded(false);
    activityRequestRef.current = true;
    setPendingActivity(activity);
    try {
      await room.updateSettings(
        activity === "bingo"
          ? {
              activity,
              subjectName: "",
              category: "",
              difficulty: "mixed",
              questionCount: 5,
              bingoMode: "line",
              teams: false,
              shuffle: true,
              participantAudio: false,
              helenaWords: false,
            }
          : {
              activity,
              subjectName: READY_LISTENING_SOURCE,
              category: "",
              difficulty: "mixed",
              questionCount: "all",
              helenaWords: false,
            },
      );
    } finally {
      activityRequestRef.current = false;
      setPendingActivity(null);
    }
  }

  useEffect(() => {
    if (authoringRoomCodeRef.current === state?.code) return;
    const previousCode = authoringRoomCodeRef.current;
    authoringRoomCodeRef.current = state?.code;
    // A criação não descarta os arquivos e a seleção preparados localmente.
    if (previousCode === "" && state?.code) return;
    restoredRoomCodeRef.current = "";
    const timer = window.setTimeout(() => {
      setManualRows([{ id: "first", word: "", translation: "" }]);
      setAppliedManualWords("");
      setAppliedRecordingSignature("");
      setManualApplyStatus("");
      setReadySearch("");
      setReadyDraftIds(state?.settings.readyWordIds ?? []);
      setReadyApplying(false);
      readyAppliedRef.current = JSON.stringify(state?.settings.readyWordIds ?? []);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [state?.code, state?.settings.readyWordIds]);

  const appliedReadyKey = JSON.stringify(state?.settings.readyWordIds ?? []);
  useEffect(() => {
    if (preparing) return;
    if (readyAppliedRef.current === appliedReadyKey) return;
    readyAppliedRef.current = appliedReadyKey;
    const timer = window.setTimeout(() => setReadyDraftIds(state?.settings.readyWordIds ?? []), 0);
    return () => window.clearTimeout(timer);
  }, [appliedReadyKey, state?.settings.readyWordIds, preparing]);

  useEffect(() => {
    if (
      !state?.code ||
      !room.isHost ||
      !room.hostDeck?.length ||
      restoredRoomCodeRef.current === state.code
    )
      return;
    if (manualWords.trim()) return;
    const roomCode = state.code;
    const restoredWords = room.hostDeck
      .map((card) => `${card.front}\t${[card.back, ...(card.acceptedAnswers ?? [])].join(" | ")}`)
      .join("\n");
    const ids = Object.fromEntries(
      room.hostDeck.flatMap((card) =>
        card.audioId ? [[normalizeListeningAnswer(card.front), card.audioId]] : [],
      ),
    );
    const timer = window.setTimeout(() => {
      restoredRoomCodeRef.current = roomCode;
      setManualRows(
        room.hostDeck.map((card) => ({
          id: card.id,
          word: card.front,
          translation: [card.back, ...(card.acceptedAnswers ?? [])].join(" | "),
          ...(card.audioId ? { audioId: card.audioId } : {}),
        })),
      );
      setAppliedManualWords(restoredWords);
      setAppliedRecordingSignature(
        room.hostDeck.map((card) => ids[normalizeListeningAnswer(card.front)] ?? "").join("|"),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [room.hostDeck, room.isHost, state?.code, manualWords]);

  if (room.isRestoring)
    return (
      <LocalRoomFullscreen>
        <div className="local-room-restoring">
          <HelenaLoading compact label="Retomando sala…" />
          <p>Reconectando você à atividade em andamento.</p>
          <button className="secondary-button" type="button" onClick={exitRoom}>
            <PaperEditorIcon name="exit" /> Voltar ao aplicativo
          </button>
        </div>
      </LocalRoomFullscreen>
    );

  if (projectorMode && (!state || !room.isOrganizer))
    return (
      <LocalRoomFullscreen>
        <div className="local-room-restoring" role="alert">
          <img src="/room-icons/projector.svg" alt="" width="48" height="48" />
          <h3>Modo projetor protegido</h3>
          <p>Abra esta tela pelo painel do professor que criou a sala.</p>
        </div>
      </LocalRoomFullscreen>
    );

  if (room.role === "participant" && !state && !room.hasSavedSession)
    return (
      <LocalRoomFullscreen>
        <form className="local-room-join" onSubmit={joinRoom}>
          <button
            className="secondary-button local-room-back-button"
            type="button"
            onClick={() => (initialJoinCode ? onExit?.() : room.setRole("choose"))}
          >
            <HelenaRoomIcon name="back" /> Voltar
          </button>
          <h3>Entrar em uma sala</h3>
          <p>Use o código do professor. Você participa com o nome da sua conta.</p>
          {scanningQr && (
            <Suspense fallback={<HelenaLoading compact label="Preparando leitor de QR code…" />}>
              <RoomQrScanner
                onRead={(value) => {
                  setCode(value);
                  setScanningQr(false);
                }}
              />
            </Suspense>
          )}
          {scanningQr && (
            <button type="button" className="secondary-button" onClick={() => setScanningQr(false)}>
              Fechar câmera
            </button>
          )}
          <label>
            <span>Código</span>
            <input
              value={code}
              onChange={(event) => setCode(normalizeLocalRoomCode(event.target.value).slice(0, 5))}
              onPaste={(event) => {
                event.preventDefault();
                setCode(normalizeLocalRoomCode(event.clipboardData.getData("text")).slice(0, 5));
              }}
              maxLength={5}
              autoComplete="off"
              inputMode="text"
              className="local-room-code-input"
              placeholder="ABCDE"
              required
            />
          </label>
          {nicknameField ?? (
            <div className="local-room-account">
              <PaperEditorIcon name="team" />
              <span>
                {name ||
                  (accountLoading
                    ? "Carregando sua conta…"
                    : "Entre na sua conta para participar.")}
              </span>
            </div>
          )}
          {requireAccount && !accountLoading && !name && onSignIn && (
            <button className="secondary-button" type="button" onClick={onSignIn}>
              <PaperEditorIcon name="team" /> Entrar na conta
            </button>
          )}
          {room.error && <p role="alert">{room.error}</p>}
          <button className="primary-button" type="submit" disabled={!canJoin}>
            <img src="/room-icons/join.svg" alt="" width="24" height="24" />
            {room.busy ? "Entrando…" : "Entrar"}
          </button>
          {(room.busy || accountLoading) && (
            <HelenaLoading
              compact
              label={room.busy ? "Entrando na sala…" : "Carregando sua conta…"}
            />
          )}
        </form>
      </LocalRoomFullscreen>
    );

  if (!state)
    return (
      <LocalRoomFullscreen>
        <div className="local-room-restoring">
          <NavigationIcon name="room" />
          <h3>Vamos retomar sua sala</h3>
          <p role="alert">
            {room.error || "A conexão foi interrompida. Sua participação está salva nesta aba."}
          </p>
          <button className="primary-button" type="button" onClick={room.reconnect}>
            <img src="/room-icons/reconnect.svg" alt="" width="24" height="24" /> Tentar novamente
          </button>
          <button className="secondary-button" type="button" onClick={exitRoom}>
            <PaperEditorIcon name="exit" /> Sair da sala
          </button>
        </div>
      </LocalRoomFullscreen>
    );
  const isHost = room.isHost;
  // Sair ou voltar como anfitrião de uma sala ainda aberta encerra a sala para todo mundo.
  const hostSessionActive = isHost && state.phase !== "finished";
  // Leitores de tela só ouviam o feedback e a contagem: mudar de pergunta ou de fase passava em
  // silêncio. Não menciona a palavra, que é justamente o que o exercício de escuta esconde.
  const phaseAnnouncement =
    state.phase === "playing" && state.settings.activity !== "bingo" && state.totalQuestions > 0
      ? `Pergunta ${state.questionIndex + 1} de ${state.totalQuestions}.`
      : state.phase === "results"
        ? "Atividade encerrada. Confira o resultado."
        : state.phase === "finished"
          ? "Sala encerrada."
          : "";
  const answered = state.answeredParticipantIds.includes(room.participantId);
  const pool = localRoomPool(state.settings);
  const availableCount =
    preparing && state.settings.subjectName === MANUAL_LISTENING_SOURCE
      ? draftDeck.length
      : (state.content?.count ?? pool.length);
  const manualInput = parseManualListeningInput(manualWords, /\t/);
  const manualDeck = manualInput.cards;
  const manualErrors = manualInput.lines.filter((line) => line.error);
  const recordingSignature = manualDeck
    .map((card) => recordingIds[normalizeListeningAnswer(card.front)] ?? "")
    .join("|");
  const recordingsReady = manualDeck.every((card) =>
    Boolean(recordingIds[normalizeListeningAnswer(card.front)]),
  );
  const manualDeckIsValid = manualDeck.length > 0 && manualErrors.length === 0 && recordingsReady;
  const usesHelenaWords =
    state.settings.activity !== "bingo" && state.settings.helenaWords === true;
  const usesReadyWords =
    !usesHelenaWords &&
    state.settings.activity !== "bingo" &&
    state.settings.subjectName === READY_LISTENING_SOURCE;
  const usesManualList = state.settings.activity !== "bingo" && !usesReadyWords && !usesHelenaWords;
  const readySelectionPending =
    usesReadyWords &&
    JSON.stringify(readyDraftIds) !== JSON.stringify(state.settings.readyWordIds ?? []);
  const readyMatches = searchReadyListeningWords(readySearch);
  const readySelected = new Set(readyDraftIds);
  const manualSelectionPending =
    usesManualList &&
    (!manualWords.trim() ||
      state.settings.subjectName !== MANUAL_LISTENING_SOURCE ||
      !room.hostDeck?.length ||
      appliedManualWords !== manualWords ||
      appliedRecordingSignature !== recordingSignature);
  const ownParticipant = state.participants.find((p) => p.id === room.participantId);
  const savedAnswer =
    ownParticipant?.lastAnswer?.questionIndex === state.questionIndex
      ? ownParticipant.lastAnswer
      : undefined;
  const feedbackCorrect = lastResult?.correct ?? savedAnswer?.correct;
  const teamScores = ROOM_TEAMS.map((team) => ({
    team,
    score: state.participants.filter((p) => p.team === team).reduce((sum, p) => sum + p.score, 0),
  }));
  async function savePreparedRecordings(code: string, credential: string) {
    const audioIds = new Map<string, string>();
    for (const row of manualRows) {
      if (row.audioFile)
        audioIds.set(
          normalizeListeningAnswer(row.word),
          await uploadRoomRecording(code, credential, row.audioFile),
        );
    }
    const uploadedDeck = draftDeck.map((card) => ({
      ...card,
      audioId: audioIds.get(normalizeListeningAnswer(card.front)) ?? card.audioId,
    }));
    if (await connection.updateSettings(draftSettings, uploadedDeck)) {
      setManualRows((rows) =>
        rows.map((row) => {
          const audioId = audioIds.get(normalizeListeningAnswer(row.word));
          return audioId ? { ...row, audioId } : row;
        }),
      );
      setAppliedRecordingSignature(
        manualDeck
          .map(
            (card) =>
              audioIds.get(normalizeListeningAnswer(card.front)) ??
              recordingIds[normalizeListeningAnswer(card.front)] ??
              "",
          )
          .join("|"),
      );
    } else {
      throw new Error("Não foi possível preparar os áudios. Tente enviar novamente.");
    }
  }

  if (projectorMode && !(state.settings.activity === "bingo" && state.settings.bingoMode))
    return (
      <LocalRoomFullscreen>
        {countdownValue !== null && <CountdownOverlay value={countdownValue} />}
        <ProjectorRoom state={state} secondsLeft={secondsLeft} />
      </LocalRoomFullscreen>
    );

  if (browsingRoom && !preparing)
    return (
      <LocalRoomFullscreen embedded>
        <section className="local-room-session room-return-hub">
          <h2>Modalidades coletivas</h2>
          <button
            className="secondary-button room-resume"
            type="button"
            onClick={() => setBrowsingRoom(false)}
          >
            <img
              src={
                state.settings.activity === "bingo"
                  ? "/room-icons/bingo.svg"
                  : "/room-icons/listening.svg"
              }
              width="40"
              height="40"
              alt=""
            />
            <span>
              <strong>Retomar sala {state.code}</strong>
              <small>
                {state.phase === "finished" ? "Sala encerrada" : "Sua sala continua disponível"}
              </small>
            </span>
            <PaperArrow />
          </button>
          <div className="local-room-activities" aria-label="Modalidades disponíveis">
            {ROOM_ACTIVITY_OPTIONS.map((activity) => (
              <div className="local-room-activity room-activity-preview" key={activity.key}>
                <picture className="local-room-activity__art">
                  <source
                    media="(max-width: 540px)"
                    srcSet={`/room-art/${activity.key === "bingo" ? "poliana-bingo" : activity.key}.webp`}
                  />
                  <img
                    src={`/room-art/${activity.key === "bingo" ? "poliana-bingo" : activity.key}-panorama.webp`}
                    alt=""
                  />
                </picture>
                <span className="local-room-activity__icon">
                  <img src={`/room-icons/${activity.key}.svg`} width="40" height="40" alt="" />
                </span>
                <strong>{activity.title}</strong>
                <small>{activity.description}</small>
              </div>
            ))}
          </div>
          <p>Retome a sala para continuar ou sair antes de criar outra.</p>
        </section>
      </LocalRoomFullscreen>
    );

  return (
    <LocalRoomFullscreen embedded={preparing}>
      {!preparing && <RoomPresenceEffects code={state.code} participants={state.participants} />}
      {countdownValue !== null && <CountdownOverlay value={countdownValue} />}
      <div
        className={`local-room-session local-room-session--${state.phase}`}
        onPointerDownCapture={() => {
          prepareRoomFeedbackSound();
          recordedPlayerRef.current?.unlock();
        }}
        onKeyDownCapture={() => {
          prepareRoomFeedbackSound();
          recordedPlayerRef.current?.unlock();
        }}
      >
        {!preparing && (
          <header className="local-room-session__header">
            <button type="button" className="secondary-button room-back" onClick={backToModalities}>
              <PaperArrow back /> Voltar
            </button>
            <div className="local-room-session__actions">
              {isHost && !preparing && (
                <button
                  className="secondary-button local-room-open-projector"
                  type="button"
                  onClick={openProjector}
                >
                  <img className="room-paper-icon" src="/room-icons/projector.svg" alt="" /> Modo
                  Projetor
                </button>
              )}
              <RoomConfirmButton
                className="secondary-button local-room-exit"
                needsConfirmation={hostSessionActive}
                title="Sair e encerrar a sala?"
                warning="Como anfitrião, sair encerra a sala para todos os participantes e não pode ser desfeito."
                confirmLabel="Encerrar sala"
                onConfirm={exitRoom}
              >
                <PaperEditorIcon name="exit" /> Sair da sala
              </RoomConfirmButton>
            </div>
          </header>
        )}
        <p className="visually-hidden" role="status" aria-live="polite">
          {phaseAnnouncement}
        </p>
        {room.error && <p role="alert">{room.error}</p>}
        {state.phase !== "finished" && (
          <RoomExpiryNotice expiresAt={state.expiresAt} now={room.serverNow} isHost={isHost} />
        )}
        {!room.isRestoring &&
          (room.connectionStatus === "reconnecting" || room.connectionStatus === "offline") && (
            <div className="local-room-connection">
              <HelenaLoading
                compact
                label={
                  room.connectionStatus === "offline"
                    ? "Sem conexão. Retomando sala…"
                    : "Reconectando sala…"
                }
              />
            </div>
          )}
        {state.settings.teams && state.phase !== "lobby" && (
          <div className="room-team-scores" aria-label="Placar por equipe">
            {teamScores.map((t) => (
              <span key={t.team}>
                <PaperMoonMark
                  compact
                  motif={t.team === "Roxo" ? "moon" : "sun"}
                  className="room-side-icon"
                />
                {ROOM_TEAM_LABELS[t.team]} <PaperDigits value={String(t.score)} />
                <span>pontos</span>
              </span>
            ))}
          </div>
        )}

        {state.phase === "lobby" ? (
          isHost ? (
            <div
              className={`local-room-lobby${preparing ? " local-room-lobby--preparing" : " local-room-lobby--created"}`}
            >
              {!preparing && (
                <div className="local-room-lobby__main">
                  <ShareRoom
                    code={state.code}
                    bingo={state.settings.activity === "bingo"}
                    locked={state.locked === true}
                    onLock={room.setRoomLocked}
                  />
                  <div className="local-room-lobby__invite">
                    {!state.settings.teams && (
                      <section
                        className="local-room-participants"
                        aria-labelledby="participants-title"
                      >
                        <div className="local-room-section-heading">
                          <h3 id="participants-title">Participantes</h3>
                          <span>
                            {participantCount}/{MAX_ROOM_PARTICIPANTS}
                          </span>
                        </div>
                        {participantCount === 0 ? (
                          <div className="local-room-participants__empty">
                            <strong>Aguardando participantes…</strong>
                            <p>
                              Compartilhe o código {state.code}. A rodada começa com uma pessoa.
                            </p>
                          </div>
                        ) : (
                          !state.settings.teams && (
                            <LobbyParticipants
                              participants={state.participants}
                              onRemove={room.kickParticipant}
                            />
                          )
                        )}
                      </section>
                    )}
                  </div>
                  {state.settings.teams && (
                    <RoomTeamBoard
                      participants={state.participants}
                      isHost
                      participantId=""
                      onAssign={room.assignTeam}
                      onRemove={room.kickParticipant}
                    />
                  )}
                </div>
              )}

              {preparing && (
                <div className="local-room-settings" inert={creating}>
                  {selectedActivity && (
                    <button
                      type="button"
                      className="secondary-button local-room-modalities"
                      ref={modalitiesButton}
                      aria-expanded={activitiesExpanded}
                      aria-controls="room-modalities"
                      onClick={() => setActivitiesExpanded((open) => !open)}
                    >
                      <img src="/room-icons/modalities.svg" alt="" width="36" height="36" />
                      Modalidades coletivas
                      <span>
                        {
                          ROOM_ACTIVITY_OPTIONS.find(
                            (activity) => activity.key === selectedActivity,
                          )?.title
                        }
                      </span>
                    </button>
                  )}
                  <div
                    id="room-modalities"
                    className={`local-room-activities${!activitiesExpanded ? " local-room-activities--collapsed" : ""}`}
                    inert={!activitiesExpanded}
                    role="radiogroup"
                    aria-label="Atividades da sala"
                  >
                    {ROOM_ACTIVITY_OPTIONS.map((activity) => (
                      <button
                        className="local-room-activity"
                        type="button"
                        disabled={!activity.enabled || pendingActivity !== null}
                        role="radio"
                        aria-checked={activity.enabled && selectedActivity === activity.key}
                        onClick={() => activity.enabled && void selectActivity(activity.key)}
                        key={activity.key}
                      >
                        <picture className="local-room-activity__art">
                          <source
                            media="(max-width: 540px)"
                            srcSet={`/room-art/${activity.key === "bingo" ? "poliana-bingo" : activity.key}.webp`}
                          />
                          <img
                            src={`/room-art/${activity.key === "bingo" ? "poliana-bingo" : activity.key}-panorama.webp`}
                            alt=""
                            width="160"
                            height="160"
                          />
                        </picture>
                        <span className="local-room-activity__icon">
                          <img
                            src={`/room-icons/${activity.key}.svg`}
                            alt=""
                            width="48"
                            height="48"
                          />
                        </span>
                        {"badge" in activity && (
                          <span className="local-room-activity__badge">{activity.badge}</span>
                        )}
                        <strong>{activity.title}</strong>
                        <small>{activity.description}</small>
                      </button>
                    ))}
                  </div>
                  {pendingActivity && <HelenaLoading compact label="Preparando atividade…" />}
                  <div
                    className={
                      "local-room-join-actions" +
                      (!activitiesExpanded ? " local-room-join-actions--collapsed" : "")
                    }
                    inert={!activitiesExpanded}
                  >
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setScanningQr(false);
                        room.setRole("participant");
                      }}
                    >
                      <img src="/room-icons/join.svg" alt="" width="22" height="22" />
                      Entrar com código
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setScanningQr(true);
                        room.setRole("participant");
                      }}
                    >
                      <img src="/room-icons/join-qr.svg" alt="" width="22" height="22" />
                      Entrar com QR code
                    </button>
                  </div>
                  {selectedActivity && (
                    <div
                      className="local-room-settings__panel"
                      inert={pendingActivity !== null || readyApplying}
                      aria-busy={pendingActivity !== null || readyApplying}
                    >
                      {state.settings.activity === "bingo" && (
                        <Suspense fallback={<HelenaLoading compact label="Preparando bingo…" />}>
                          <NumberBingo
                            state={state}
                            isHost={isHost}
                            participantId={room.participantId}
                            onMode={(bingoMode) => void room.updateSettings({ bingoMode })}
                            onPhysical={(bingoPhysical) =>
                              void room.updateSettings({ bingoPhysical })
                            }
                            onDraw={room.nextQuestion}
                            onAnswer={room.submitAnswer}
                          />
                        </Suspense>
                      )}
                      {state.settings.activity !== "bingo" && <h4>Banco de palavras</h4>}
                      {state.settings.activity !== "bingo" && (
                        <div
                          className="local-room-source"
                          role="group"
                          aria-label="Banco de palavras"
                        >
                          <button
                            type="button"
                            className="local-room-source__option"
                            aria-pressed={usesManualList}
                            disabled={readyApplying}
                            onClick={() =>
                              void room.updateSettings({
                                subjectName: MANUAL_LISTENING_SOURCE,
                                helenaWords: false,
                              })
                            }
                          >
                            <img src="/room-icons/upload.svg" alt="" width="40" height="40" />
                            <span>Enviar arquivos</span>
                          </button>
                          <button
                            type="button"
                            className="local-room-source__option"
                            aria-pressed={usesReadyWords}
                            disabled={readyApplying}
                            onClick={() => {
                              setReadyDraftIds(state.settings.readyWordIds ?? []);
                              void room.updateSettings(
                                {
                                  subjectName: READY_LISTENING_SOURCE,
                                  helenaWords: false,
                                  difficulty: "mixed",
                                  category: "",
                                  questionCount: "all",
                                  readyWordIds: state.settings.readyWordIds ?? [],
                                },
                                [],
                              );
                              setAppliedManualWords("");
                            }}
                          >
                            <img src="/room-icons/word-bank.svg" alt="" width="40" height="40" />
                            <span>Palavras prontas</span>
                          </button>
                          <button
                            type="button"
                            className="local-room-source__option"
                            aria-pressed={usesHelenaWords}
                            onClick={() =>
                              void room.updateSettings({
                                helenaWords: true,
                                helenaWordCount: draftSettings.helenaWordCount ?? 10,
                                subjectName: READY_LISTENING_SOURCE,
                                questionCount: "all",
                              })
                            }
                          >
                            <img
                              src="/room-icons/helena-word-choice.svg"
                              alt=""
                              width="40"
                              height="40"
                            />
                            <span>Palavras escolhidas pela Helena</span>
                          </button>
                        </div>
                      )}
                      {usesHelenaWords && (
                        <>
                          <p className="local-room-helena-help">
                            A Helena sorteia palavras do banco ao começar, sem repetir. Você também
                            pode participar sem ver a lista antes.
                          </p>
                          <RoomStepSlider
                            label="Quantidade de palavras"
                            value={state.settings.helenaWordCount ?? 10}
                            steps={HELENA_WORD_STEPS}
                            onCommit={(helenaWordCount) =>
                              void room.updateSettings({ helenaWordCount })
                            }
                          />
                        </>
                      )}
                      {usesReadyWords && (
                        <div className="local-room-ready-words" aria-busy={readyApplying}>
                          <button
                            type="button"
                            className="local-room-ready-words__subject"
                            aria-expanded={readyWordsOpen}
                            aria-controls="room-english-words"
                            aria-label="Inglês"
                            onClick={() => setReadyWordsOpen((open) => !open)}
                          >
                            <img src="/room-art/english-study.webp" alt="" width="48" height="48" />
                            <span className="local-room-ready-words__subject-label">
                              <small>MATÉRIA</small>
                              <strong>Inglês</strong>
                            </span>
                            <span>
                              {readyDraftIds.length > 0
                                ? `${readyDraftIds.length} selecionadas`
                                : `${READY_LISTENING_DECK.length} palavras com áudio`}
                            </span>
                            <span className="local-room-ready-words__disclosure" aria-hidden="true">
                              <PaperActionIcon name="plus" />
                            </span>
                          </button>
                          {readyWordsOpen && (
                            <div id="room-english-words" className="local-room-ready-words__body">
                              <label className="local-room-ready-words__search">
                                <img src="/room-icons/search.svg" alt="" width="22" height="22" />
                                <input
                                  type="search"
                                  value={readySearch}
                                  onChange={(event) => setReadySearch(event.target.value)}
                                  placeholder="Buscar em inglês ou português"
                                  aria-label="Buscar palavras em inglês ou português"
                                />
                              </label>
                              {(readyDraftIds.length > 0 || removingReadyIds.length > 0) && (
                                <div
                                  className="local-room-ready-words__selected"
                                  aria-label="Palavras selecionadas"
                                >
                                  {READY_LISTENING_DECK.filter(
                                    (card) =>
                                      readySelected.has(card.id) ||
                                      removingReadyIds.includes(card.id),
                                  ).map((card) => (
                                    <button
                                      type="button"
                                      key={card.id}
                                      className={
                                        removingReadyIds.includes(card.id) &&
                                        !readySelected.has(card.id)
                                          ? "is-removing"
                                          : ""
                                      }
                                      aria-hidden={
                                        removingReadyIds.includes(card.id) &&
                                        !readySelected.has(card.id)
                                          ? true
                                          : undefined
                                      }
                                      disabled={
                                        readyApplying ||
                                        (removingReadyIds.includes(card.id) &&
                                          !readySelected.has(card.id))
                                      }
                                      onClick={() => removeReadyWords([card.id])}
                                      aria-label={`Remover ${card.front}`}
                                    >
                                      <PaperEnglishWord value={card.front} />
                                      <span aria-hidden="true">×</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className="local-room-ready-words__tools">
                                <strong>{readyDraftIds.length} selecionadas</strong>
                                {readyDraftIds.length > 0 && (
                                  <button
                                    type="button"
                                    disabled={readyApplying}
                                    onClick={() => removeReadyWords(readyDraftIds)}
                                  >
                                    Limpar
                                  </button>
                                )}
                              </div>
                              <div
                                className="local-room-ready-words__results"
                                aria-label="Resultados da busca"
                              >
                                {readyMatches.map((card) => (
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={readySelected.has(card.id)}
                                    className={
                                      removingReadyIds.includes(card.id) &&
                                      !readySelected.has(card.id)
                                        ? "is-removing"
                                        : ""
                                    }
                                    key={card.id}
                                    disabled={readyApplying}
                                    onClick={() =>
                                      readySelected.has(card.id)
                                        ? removeReadyWords([card.id])
                                        : setReadyDraftIds((ids) => [...ids, card.id])
                                    }
                                  >
                                    <span
                                      className="local-room-ready-words__check"
                                      aria-hidden="true"
                                    >
                                      {readySelected.has(card.id) ? (
                                        <PaperCheckIcon />
                                      ) : (
                                        <PaperActionIcon name="plus" />
                                      )}
                                    </span>
                                    <span>
                                      <strong>
                                        <PaperEnglishWord value={card.front} />
                                      </strong>
                                      <small>{card.back}</small>
                                    </span>
                                  </button>
                                ))}
                                {readyMatches.length === 0 && <p>Nenhuma palavra encontrada.</p>}
                              </div>
                              <div className="local-room-ready-words__apply">
                                <span>Todas as palavras selecionadas entram na rodada.</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {state.settings.activity !== "bingo" && usesManualList && (
                        <div className="local-room-manual">
                          <div>
                            <strong>Seus arquivos de áudio</strong>
                            <span>
                              {manualDeck.length} válidas
                              {manualErrors.length > 0
                                ? ` · ${manualErrors.length} precisam de correção`
                                : ""}
                            </span>
                          </div>
                          <p>Envie o áudio e informe a palavra e a tradução de cada fala.</p>
                          <p className="local-room-manual__privacy">
                            {preparing
                              ? "Os arquivos ficam neste dispositivo até criar a sala."
                              : "Os arquivos ficam nesta sala por até 4 horas. Eles não treinam a Olena."}
                          </p>
                          <div className="local-room-manual__rows">
                            {manualRows.map((row, index) => (
                              <div className="local-room-manual__row" key={row.id}>
                                <div className="local-room-manual__row-heading">
                                  <strong>Fala {index + 1}</strong>
                                  <button
                                    type="button"
                                    className="local-room-manual__remove"
                                    aria-label={`Remover fala ${index + 1}`}
                                    onClick={() => {
                                      setManualRows((rows) =>
                                        rows.length === 1
                                          ? [{ id: crypto.randomUUID(), word: "", translation: "" }]
                                          : rows.filter((item) => item.id !== row.id),
                                      );
                                      setManualApplyStatus("");
                                    }}
                                  >
                                    Remover
                                  </button>
                                </div>
                                <RoomRecordingInput
                                  key={`${state.code}:${row.id}`}
                                  word={row.word || `Fala ${index + 1}`}
                                  translation=""
                                  audioId={row.audioId}
                                  staged={Boolean(row.audioFile)}
                                  stagedBlob={row.audioFile}
                                  code={state.code}
                                  credential={speechCredential() ?? ""}
                                  showHeading={false}
                                  onStaged={(audioFile) =>
                                    setManualRows((rows) =>
                                      rows.map((item) =>
                                        item.id === row.id
                                          ? { ...item, audioFile, pendingAudio: false }
                                          : item,
                                      ),
                                    )
                                  }
                                  onPending={() => {
                                    setManualRows((rows) =>
                                      rows.map((item) =>
                                        item.id === row.id
                                          ? {
                                              id: item.id,
                                              word: item.word,
                                              translation: item.translation,
                                              pendingAudio: true,
                                            }
                                          : item,
                                      ),
                                    );
                                    setManualApplyStatus("");
                                  }}
                                  onSaved={(audioId) => {
                                    setManualRows((rows) =>
                                      rows.map((item) =>
                                        item.id === row.id
                                          ? { ...item, audioId, pendingAudio: false }
                                          : item,
                                      ),
                                    );
                                    setManualApplyStatus("");
                                  }}
                                />
                                <div className="local-room-manual__fields">
                                  <label>
                                    <span>Palavra em inglês</span>
                                    <input
                                      aria-label={`Palavra em inglês da fala ${index + 1}`}
                                      value={row.word}
                                      maxLength={200}
                                      placeholder="Ex.: school"
                                      onChange={(event) => {
                                        setManualRows((rows) =>
                                          rows.map((item) =>
                                            item.id === row.id
                                              ? { ...item, word: event.target.value }
                                              : item,
                                          ),
                                        );
                                        setManualApplyStatus("");
                                      }}
                                    />
                                  </label>
                                  <label>
                                    <span>Tradução</span>
                                    <input
                                      aria-label={`Tradução da fala ${index + 1}`}
                                      value={row.translation}
                                      maxLength={600}
                                      placeholder="Ex.: escola"
                                      onChange={(event) => {
                                        setManualRows((rows) =>
                                          rows.map((item) =>
                                            item.id === row.id
                                              ? { ...item, translation: event.target.value }
                                              : item,
                                          ),
                                        );
                                        setManualApplyStatus("");
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={
                                manualRows.length >= 30 ||
                                manualRows.some(
                                  (row) =>
                                    !row.word.trim() ||
                                    !row.translation.trim() ||
                                    (!row.audioFile && !row.audioId) ||
                                    row.pendingAudio,
                                )
                              }
                              onClick={() =>
                                setManualRows((rows) =>
                                  rows.some(
                                    (row) =>
                                      !row.word.trim() ||
                                      !row.translation.trim() ||
                                      (!row.audioFile && !row.audioId) ||
                                      row.pendingAudio,
                                  )
                                    ? rows
                                    : [
                                        ...rows,
                                        { id: crypto.randomUUID(), word: "", translation: "" },
                                      ],
                                )
                              }
                            >
                              <img src="/room-icons/upload.svg" alt="" width="22" height="22" />
                              Adicionar fala
                            </button>
                          </div>
                          {manualErrors.length > 0 && (
                            <ul className="local-room-manual__errors" aria-live="polite">
                              {manualErrors.map((line) => (
                                <li key={line.lineNumber}>
                                  Fala {line.lineNumber}: {line.error}.
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="local-room-manual__action">
                            <p aria-live="polite">
                              {manualApplyStatus ||
                                (manualSelectionPending && manualWords.trim()
                                  ? "● Alterações ainda não aplicadas"
                                  : manualDeckIsValid
                                    ? `${countLabel(manualDeck.length, "fala pronta", "falas prontas")} para aplicar.`
                                    : manualDeck.length && !recordingsReady
                                      ? "Guarde o áudio de cada fala para continuar."
                                      : "Adicione pelo menos uma palavra e sua tradução.")}
                            </p>
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={!manualDeckIsValid || !manualSelectionPending}
                              onClick={() => {
                                void room
                                  .updateSettings(
                                    {
                                      subjectName: MANUAL_LISTENING_SOURCE,
                                      difficulty: "mixed",
                                      category: "",
                                      questionCount: "all",
                                    },
                                    manualDeck.map((card) => ({
                                      ...card,
                                      audioId: recordingIds[normalizeListeningAnswer(card.front)]!,
                                    })),
                                  )
                                  .then((saved) => {
                                    if (!saved) return;
                                    setAppliedManualWords(manualWords);
                                    setAppliedRecordingSignature(recordingSignature);
                                    setManualApplyStatus(
                                      `${countLabel(manualDeck.length, "fala adicionada", "falas adicionadas")} à rodada`,
                                    );
                                  });
                              }}
                            >
                              {manualApplyStatus ? (
                                <>
                                  Palavras aplicadas <PaperCheckIcon />
                                </>
                              ) : (
                                "Aplicar palavras"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      <label className="local-room-activity-native">
                        <span>Atividade</span>
                        <select
                          value={state.settings.activity ?? "listening"}
                          onChange={(event) =>
                            selectActivity(event.target.value as "listening" | "bingo")
                          }
                        >
                          <option value="listening">Quiz de escuta</option>
                          <option value="bingo">Bingo de números</option>
                        </select>
                      </label>
                      {state.settings.activity === "bingo" && !state.settings.bingoMode && (
                        <>
                          <label>
                            <span>Matéria / tema</span>
                            <select
                              value={state.settings.category ?? ""}
                              disabled={Boolean(state.settings.subjectName)}
                              onChange={(event) =>
                                void room.updateSettings({ category: event.target.value })
                              }
                            >
                              <option value="">Inglês · todos os temas</option>
                              {ROOM_CATEGORIES.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </label>
                          <p>
                            {availableCount} questões disponíveis neste filtro. Prévia:{" "}
                            {(
                              state.content?.preview ?? pool.slice(0, 3).map((card) => card.front)
                            ).join(", ") || "Nenhuma questão"}
                            .
                          </p>
                        </>
                      )}
                      {!(state.settings.activity === "bingo" && state.settings.bingoMode) && (
                        <div
                          className="local-room-response-options"
                          role="group"
                          aria-label="Respostas"
                        >
                          {[false, true].map((teams) => (
                            <button
                              className="secondary-button"
                              type="button"
                              key={String(teams)}
                              aria-label={
                                teams ? "Responder em equipes" : "Responder individualmente"
                              }
                              aria-pressed={Boolean(state.settings.teams) === teams}
                              onClick={() => void room.updateSettings({ teams })}
                            >
                              <svg viewBox="0 0 48 48" aria-hidden="true">
                                <path
                                  fill={teams ? "#27834A" : "#FACC15"}
                                  d="M18 4h12l5 8-5 10H18l-5-10ZM12 26h24l6 17H6Z"
                                />
                                <path
                                  fill={teams ? "#83CA8A" : "#FFE88D"}
                                  d={
                                    teams
                                      ? "M5 10h8l3 6-3 7H5l-3-7ZM2 28h12l4 15H0Z M35 10h8l3 6-3 7h-8l-3-7ZM34 28h12l2 15H30Z"
                                      : "M18 4h12l-8 8h-9Z M12 26h10L6 43Z"
                                  }
                                />
                              </svg>
                              <span>{teams ? "Em equipes" : "Cada pessoa"}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {!usesHelenaWords &&
                        !(state.settings.activity === "bingo" && state.settings.bingoMode) && (
                          <label>
                            <input
                              type="checkbox"
                              checked={state.settings.shuffle !== false}
                              onChange={(event) =>
                                void room.updateSettings({ shuffle: event.target.checked })
                              }
                            />{" "}
                            Embaralhar questões
                          </label>
                        )}
                      {state.settings.activity === "bingo" && !state.settings.bingoMode && (
                        <label>
                          <span>Dificuldade</span>
                          <select
                            value={state.settings.difficulty}
                            onChange={(event) =>
                              void room.updateSettings({
                                difficulty: event.target.value as LocalRoomSettings["difficulty"],
                              })
                            }
                          >
                            <option value="mixed">
                              Misto ·{" "}
                              {state.content?.difficultyCounts?.mixed ??
                                localRoomPool({ ...state.settings, difficulty: "mixed" }).length}
                            </option>
                            <option value="easy">
                              Fácil ·{" "}
                              {state.content?.difficultyCounts?.easy ??
                                localRoomPool({ ...state.settings, difficulty: "easy" }).length}
                            </option>
                            <option value="medium">
                              Médio ·{" "}
                              {state.content?.difficultyCounts?.medium ??
                                localRoomPool({ ...state.settings, difficulty: "medium" }).length}
                            </option>
                            <option value="hard">
                              Difícil ·{" "}
                              {state.content?.difficultyCounts?.hard ??
                                localRoomPool({ ...state.settings, difficulty: "hard" }).length}
                            </option>
                          </select>
                        </label>
                      )}
                      {state.settings.activity !== "bingo" && (
                        <label>
                          <input
                            type="checkbox"
                            checked={state.settings.participantAudio === true}
                            onChange={(event) =>
                              void room.updateSettings({ participantAudio: event.target.checked })
                            }
                          />
                          Áudio nos dispositivos dos participantes
                          <small className="local-room-participant-audio-help">
                            Ao ativar, o áudio toca automaticamente para todos que entrarem na sala,
                            depois da contagem inicial.
                          </small>
                        </label>
                      )}
                      {!(state.settings.activity === "bingo" && state.settings.bingoMode) && (
                        <RoomStepSlider
                          label="Tempo por pergunta"
                          value={state.settings.roundSeconds}
                          steps={TIME_STEPS}
                          suffix="s"
                          onCommit={(value) =>
                            void room.updateSettings({ roundSeconds: value as 5 | 10 | 15 | 30 })
                          }
                        />
                      )}
                      {room.error && <p role="alert">{room.error}</p>}
                    </div>
                  )}
                </div>
              )}
              {(!preparing || selectedActivity) && (
                <div className="local-room-action-bar">
                  {!preparing &&
                    !room.hostPlaying &&
                    (state.settings.activity === "bingo" || usesHelenaWords) &&
                    nicknameField}
                  {!preparing && (state.settings.activity === "bingo" || usesHelenaWords) && (
                    <button
                      type="button"
                      className="secondary-button"
                      aria-pressed={room.hostPlaying}
                      disabled={room.busy}
                      onClick={() => {
                        prepareRoomFeedbackSound();
                        void room.setHostParticipation(
                          !room.hostPlaying,
                          name || "Organizador",
                          profile.avatarUrl,
                          isGuest ? 1 : accountLevel,
                        );
                      }}
                    >
                      <PaperEditorIcon name="team" />
                      {room.hostPlaying ? "Participando da atividade" : "Também quero participar"}
                    </button>
                  )}
                  <div>
                    <button
                      className="primary-button"
                      type="button"
                      disabled={
                        (!preparing && participantCount === 0) ||
                        creating ||
                        room.busy ||
                        availableCount === 0 ||
                        readyApplying ||
                        (usesReadyWords && readySelectionPending) ||
                        manualSelectionPending ||
                        pendingActivity !== null
                      }
                      onClick={() => {
                        prepareRoomFeedbackSound();
                        void (async () => {
                          if (preparing) {
                            setCreating(true);
                            setCreationError("");
                            try {
                              const created = await connection.createRoom({
                                ...draftSettings,
                                readyWordIds: readyDraftIds,
                                audioRepetitions: "unlimited",
                                autoPlayAudio: true,
                              });
                              if (!created) return;
                              if (usesManualList)
                                await savePreparedRecordings(created.code, created.hostToken);
                            } catch (caught) {
                              setCreationError(
                                caught instanceof Error
                                  ? caught.message
                                  : "Não foi possível preparar os áudios da sala.",
                              );
                            } finally {
                              setCreating(false);
                            }
                            return;
                          }
                          if (
                            state.settings.activity !== "bingo" &&
                            state.settings.questionCount !== "all"
                          ) {
                            if (!(await room.updateSettings({ questionCount: "all" }))) return;
                          }
                          await room.startRound();
                        })();
                      }}
                      aria-describedby={
                        participantCount === 0 || manualSelectionPending || usesReadyWords
                          ? "local-room-start-help"
                          : undefined
                      }
                    >
                      <HelenaRoomIcon name="play" size={18} />{" "}
                      {preparing ? "Criar sala" : "Iniciar atividade"}
                    </button>
                    {!preparing &&
                      (participantCount === 0 || manualSelectionPending || usesReadyWords) && (
                        <small id="local-room-start-help">
                          {participantCount === 0
                            ? "Aguarde pelo menos um aluno entrar"
                            : manualSelectionPending
                              ? "Guarde os áudios e aplique as palavras antes de iniciar"
                              : readySelectionPending
                                ? "Aplique a seleção antes de iniciar"
                                : ""}
                        </small>
                      )}
                  </div>
                  {!preparing && creationError && (
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={creating}
                      onClick={() => {
                        const credential = connection.organizerCredential();
                        if (!credential) return;
                        setCreating(true);
                        setCreationError("");
                        void savePreparedRecordings(state.code, credential)
                          .catch((caught: unknown) => {
                            setCreationError(
                              caught instanceof Error
                                ? caught.message
                                : "Não foi possível enviar os áudios.",
                            );
                          })
                          .finally(() => setCreating(false));
                      }}
                    >
                      Tentar enviar áudios novamente
                    </button>
                  )}
                  {(creating || room.busy) && (
                    <HelenaLoading
                      compact
                      label={preparing ? "Criando sala…" : "Preparando atividade…"}
                    />
                  )}
                  {creationError && <p role="alert">{creationError}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="local-room-waiting">
              <PaperEditorIcon name="team" />
              <h3>Aguardando o início</h3>
              <p>O organizador controla esta sala. Código: {state.code}</p>
              {state.settings.participantAudio === true && (
                <p className="local-room-audio-status" role="status">
                  <RoomAudioIcon /> Áudio da sala ativado. A reprodução começa com a rodada.
                </p>
              )}
              {state.settings.teams && (
                <RoomTeamBoard
                  participants={state.participants}
                  isHost={false}
                  participantId={room.participantId}
                  onAssign={room.assignTeam}
                />
              )}
              {state.settings.activity === "bingo" && !state.settings.bingoMode && (
                <ListeningOnlineNotice
                  choice={online.choice}
                  onChoose={online.choose}
                  variant="compact"
                  roomAudio
                />
              )}
            </div>
          )
        ) : state.phase === "playing" &&
          state.settings.activity === "bingo" &&
          state.settings.bingoMode ? (
          <Suspense fallback={<HelenaLoading label="Carregando cartelas…" />}>
            <NumberBingo
              key={state.roundId}
              state={state}
              isHost={room.isOrganizer}
              participantId={room.participantId}
              onMode={() => {}}
              onDraw={room.nextQuestion}
              starting={countdownValue !== null}
              onAnswer={room.submitAnswer}
              onReview={room.reviewBingo}
              onFinalize={room.finalizeBingo}
            />
          </Suspense>
        ) : state.phase === "playing" && state.currentQuestion ? (
          <div className="local-room-round">
            <div className="local-room-round__progress">
              <span>
                Pergunta {state.questionIndex + 1} de {state.totalQuestions}
              </span>
              <span className="local-room-round__timer">
                <RoomClockIcon /> <PaperDigits value={String(secondsLeft)} />
                <RoomSecondsUnit />
              </span>
            </div>
            {isHost ? (
              <>
                <div className="local-room-round__host-question">
                  <RoomAudioIcon playing={naturalState.status === "playing"} />
                  <span>
                    {revealHostWord
                      ? state.currentQuestion.front
                      : naturalState.status === "playing"
                        ? "Áudio reproduzindo"
                        : "Áudio reproduzido"}
                  </span>
                </div>
                <button
                  className="secondary-button local-room-host-audio"
                  type="button"
                  disabled={roundAudioLocked || naturalState.status === "generating"}
                  onClick={() => playQuestionAudio(state.currentQuestion!.front)}
                >
                  <RoomAudioIcon /> Reproduzir áudio
                </button>
                <button
                  className="secondary-button local-room-host-reveal"
                  type="button"
                  aria-pressed={revealHostWord}
                  title="A palavra ficará visível para quem estiver vendo este painel."
                  onClick={() => {
                    if (revealHostWord) {
                      setRevealHostWord(false);
                      setConfirmRevealHostWord(false);
                    } else if (confirmRevealHostWord) {
                      setRevealHostWord(true);
                      setConfirmRevealHostWord(false);
                    } else {
                      setConfirmRevealHostWord(true);
                    }
                  }}
                >
                  {revealHostWord
                    ? "Ocultar palavra"
                    : confirmRevealHostWord
                      ? "Confirmar revelação"
                      : "Revelar palavra"}
                </button>
                {confirmRevealHostWord && (
                  <p className="local-room-reveal-warning" role="status">
                    Confirme apenas se quiser mostrar a resposta para quem vê este painel.
                  </p>
                )}
                {naturalState.message && naturalState.status !== "ready" && (
                  <p className="local-room-audio-status" role="status">
                    {naturalState.message}
                  </p>
                )}
                {state.settings.activity === "bingo" && !online.allowed && (
                  <ListeningOnlineNotice
                    choice={online.choice}
                    onChoose={online.choose}
                    variant="compact"
                    roomAudio
                  />
                )}
                <p>
                  {state.answeredParticipantIds.length} de {state.participants.length} já
                  responderam. Quando todos responderem, o resultado permanece por três segundos.
                </p>
                <Scoreboard participants={state.participants} questionIndex={state.questionIndex} />
                <RoomConfirmButton
                  needsConfirmation={false}
                  title="Encerrar a sala?"
                  warning="Isso encerra a sala para todos os participantes e não pode ser desfeito."
                  confirmLabel="Encerrar sala"
                  onConfirm={() => void room.endRoom()}
                >
                  Encerrar sala
                </RoomConfirmButton>
              </>
            ) : state.settings.activity === "bingo" ? (
              <div className="local-room-bingo">
                <h3>Complete sua cartela</h3>
                <p>
                  Ouça a palavra e marque a tradução correspondente. Vence quem completar a cartela.
                </p>
                <button
                  className="secondary-button"
                  disabled={roundAudioLocked || naturalState.status === "generating"}
                  onClick={() => playQuestionAudio(state.currentQuestion!.front)}
                >
                  <RoomAudioIcon /> Ouvir palavra
                </button>
                {naturalState.message && naturalState.status !== "ready" && (
                  <p className="local-room-audio-status" role="status">
                    {naturalState.message}
                  </p>
                )}
                {state.settings.activity === "bingo" && !online.allowed && (
                  <ListeningOnlineNotice
                    choice={online.choice}
                    onChoose={online.choose}
                    variant="compact"
                    roomAudio
                  />
                )}
                <div className="local-room-bingo-grid">
                  {(ownParticipant?.bingoCard ?? []).map((id) => (
                    <button
                      key={id}
                      className="secondary-button"
                      aria-pressed={ownParticipant?.bingoMarks?.includes(id) ?? false}
                      disabled={
                        markPending ||
                        answered ||
                        secondsLeft === 0 ||
                        ownParticipant?.bingoMarks?.includes(id)
                      }
                      onClick={() => void markBingoWord(state.questionIndex, id)}
                    >
                      {state.bingoWords?.find((word) => word.id === id)?.text ?? id}
                      {ownParticipant?.bingoMarks?.includes(id) ? <PaperCheckIcon /> : null}
                    </button>
                  ))}
                </div>
                <button
                  className="secondary-button"
                  disabled={markPending || answered || secondsLeft === 0}
                  onClick={() => void markBingoWord(state.questionIndex, "pass")}
                >
                  Não está na minha cartela
                </button>
                {markFeedback && (
                  <p className="local-room-audio-status" role="status">
                    {markFeedback}
                  </p>
                )}
                {markPending && <HelenaLoading compact label="Enviando…" />}
              </div>
            ) : answered ? (
              <div
                className={`local-room-answer-feedback ${feedbackCorrect === true ? "is-correct" : feedbackCorrect === false ? "is-wrong" : ""}`}
                role="status"
                aria-live="polite"
              >
                {feedbackCorrect !== undefined ? (
                  <RoomAnswerHelena
                    key={`${state.code}:${state.questionIndex}:${state.questionStartedAt}`}
                    correct={feedbackCorrect}
                  />
                ) : (
                  <PaperCheckIcon size={28} />
                )}
                <h3>
                  {feedbackCorrect === true
                    ? "Correto!"
                    : feedbackCorrect === false
                      ? "Ainda não foi dessa vez"
                      : "Resposta recebida"}
                </h3>
                {lastResult?.correct && <RoomConfetti />}
                {lastResult?.correct && (
                  <RoomSpeedNotice
                    key={`${state.code}:${state.questionIndex}:${state.questionStartedAt}`}
                    points={lastResult.pointsChange}
                  />
                )}
                {!lastResult?.correct && lastResult?.submittedAnswer && (
                  <p>
                    Você respondeu: <strong>{lastResult.submittedAnswer}</strong>
                  </p>
                )}
                {lastResult?.question && (
                  <div className="local-room-answer-feedback__pair">
                    <strong>
                      <PaperEnglishWord value={lastResult.question.front} />
                    </strong>
                    <span>{lastResult.question.back}</span>
                  </div>
                )}
                {lastResult && lastResult.pointsChange !== 0 && (
                  <p className="local-room-xp-feedback">
                    <RoomPointsIcon /> {lastResult.pointsChange > 0 ? "+" : ""}
                    {lastResult.pointsChange} pontos
                  </p>
                )}
                {lastResult?.question && (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={
                      roundAudioLocked ||
                      replayCooldownSeconds > 0 ||
                      naturalState.status === "generating"
                    }
                    onClick={() => replayQuestionAudio(lastResult.question!.front)}
                  >
                    <RoomAudioIcon />
                    {replayCooldownSeconds > 0
                      ? `Ouvir novamente em ${replayCooldownSeconds}s`
                      : "Ouvir novamente"}
                  </button>
                )}
                {state.feedbackUntil !== undefined ? (
                  <div className="local-room-feedback-countdown">
                    <p>
                      {feedbackMsLeft > 0
                        ? `Próxima pergunta em ${Math.ceil(feedbackMsLeft / 1_000)} segundos.`
                        : "Atualizando pergunta…"}
                    </p>
                    <span aria-hidden="true">
                      <i style={{ transform: `scaleX(${feedbackMsLeft / ROOM_FEEDBACK_MS})` }} />
                    </span>
                  </div>
                ) : (
                  <div className="local-room-answer-received">
                    <strong>
                      Resposta recebida <PaperCheckIcon />
                    </strong>
                    <p>Aguardando a turma.</p>
                  </div>
                )}
              </div>
            ) : (
              <form className="local-room-answer" onSubmit={submitAnswer}>
                <button
                  className="secondary-button"
                  type="button"
                  onPointerDown={(event) => {
                    if (
                      event.pointerType === "touch" &&
                      document.activeElement === answerInputRef.current
                    )
                      event.preventDefault();
                  }}
                  disabled={
                    roundAudioLocked ||
                    replayCooldownSeconds > 0 ||
                    naturalState.status === "generating"
                  }
                  onClick={() => replayQuestionAudio(state.currentQuestion!.front)}
                >
                  <RoomAudioIcon />
                  {replayCooldownSeconds > 0
                    ? `Ouvir novamente em ${replayCooldownSeconds}s`
                    : "Ouvir novamente"}
                </button>
                {naturalState.message && naturalState.status !== "ready" && (
                  <p className="local-room-audio-status" role="status">
                    {naturalState.message}
                  </p>
                )}
                <label>
                  <span>Digite a tradução</span>
                  <input
                    ref={answerInputRef}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    disabled={isSubmittingAnswer || room.serverNow() < state.questionStartedAt}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </label>
                <button
                  className="primary-button local-room-answer__submit"
                  type="submit"
                  disabled={isSubmittingAnswer || room.serverNow() < state.questionStartedAt}
                >
                  {isSubmittingAnswer ? "Enviando…" : "Responder"}
                </button>
                {isSubmittingAnswer && <HelenaLoading compact label="Enviando resposta…" />}
              </form>
            )}
          </div>
        ) : state.phase === "results" ? (
          <div className="local-room-finished">
            {state.settings.activity === "bingo" && state.settings.bingoMode && (
              <BingoWinners state={state} participantId={room.participantId} />
            )}
            {state.settings.activity !== "bingo" && <Podium participants={state.participants} />}
            {room.isHost ? (
              <div className="local-room-results-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={!state.participants.some((p) => p.online !== false)}
                  onClick={room.repeatRound}
                >
                  <HelenaRoomIcon name="play" size={18} /> Repetir
                </button>
                <button className="secondary-button" type="button" onClick={room.returnToLobby}>
                  Trocar atividade
                </button>
                <RoomConfirmButton
                  needsConfirmation={false}
                  title="Encerrar a sala?"
                  warning="Isso encerra a sala para todos os participantes e não pode ser desfeito."
                  confirmLabel="Encerrar sala"
                  onConfirm={() => void room.endRoom()}
                >
                  <HelenaRoomIcon name="close" size={18} /> Encerrar sala
                </RoomConfirmButton>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="local-room-finished">
            <div className="local-room-waiting" role="status">
              <HelenaRoomIcon name="close" size={24} />
              <h3>Sala encerrada</h3>
            </div>
            {state.settings.activity !== "bingo" && <Podium participants={state.participants} />}
            <button className="secondary-button" type="button" onClick={room.reset}>
              Sair
            </button>
          </div>
        )}
        {!isHost &&
          state.settings.activity !== "bingo" &&
          (state.phase === "results" || state.phase === "finished") && (
            <RoomRewardNotice reward={ownParticipant?.reward} />
          )}
        {state.settings.activity === "bingo" && state.phase === "finished" && (
          <RoomRewardNotice bingo reward={ownParticipant?.reward} />
        )}
      </div>
    </LocalRoomFullscreen>
  );
}
