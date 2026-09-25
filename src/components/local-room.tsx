import { Check, Copy, DoorOpen, Maximize2, MonitorUp, Radio, Users, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  buildLocalRoomJoinUrl,
  formatRoomEstimatedDuration,
  isValidLocalRoomCode,
  MAX_ROOM_PARTICIPANTS,
  normalizeLocalRoomCode,
  rankLocalRoomParticipants,
  localRoomPool,
  roomSecondsLeft,
  type LocalRoomAnswerFeedback,
  ROOM_CATEGORIES,
  type LocalRoomParticipant,
  type LocalRoomSettings,
  type PublicLocalRoomState,
} from "../domain/local-room";
import { parseManualListeningInput } from "../domain/listening-quiz";
import { selectFallbackEnglishVoice, speakEnglish } from "../data/speech-voice";
import { NaturalVoicePlayer, type NaturalVoiceState } from "../data/listening-audio";
import { useListeningOnline } from "../hooks/use-listening-online";
import { ListeningOnlineNotice } from "./listening-online-notice";
import {
  LOCAL_ROOM_SESSION_KEY,
  useLocalRoom,
  type RoomConnectionStatus,
} from "../hooks/use-local-room";
import { ThemeToggle } from "./app-navigation";
import { HelenaLoading } from "./helena-loading";
import { NavigationIcon } from "./navigation-icon";
import { HelenaRoomIcon } from "./helena-room-icon";
import { RoomQrCode } from "./room-qr-code";

const DEFAULT_SETTINGS: LocalRoomSettings = {
  difficulty: "mixed",
  questionCount: "all",
  roundSeconds: 30,
  subjectName: "Lista personalizada",
  audioRate: 1,
  audioRepetitions: "unlimited",
  autoPlayAudio: true,
};

const ROOM_ACTIVITY_OPTIONS = [
  {
    key: "listening",
    icon: "focus",
    title: "Escuta coletiva",
    badge: "Recomendado",
    enabled: true,
  },
  {
    key: "flashcards",
    icon: "learn",
    title: "Flashcards em grupo",
    badge: "Em breve",
    enabled: false,
  },
  {
    key: "quiz",
    icon: "medal-first",
    title: "Quiz competitivo",
    badge: "Em breve",
    enabled: false,
  },
  {
    key: "bingo",
    icon: "activity-bank",
    title: "Bingo",
    enabled: true,
  },
] as const;

const MEDAL_ICON_BY_RANK = ["medal-first", "medal-second", "medal-third"] as const;
const MANUAL_LISTENING_SOURCE = "Lista personalizada";
const ANSWER_FEEDBACK_MS = 3_000;
const AUDIO_REPLAY_COOLDOWN_MS = 5_000;

// Passos da contagem regressiva antes de liberar a primeira pergunta:
// 3, 2, 1 e "Vai!" (representado por 0), cada um por COUNTDOWN_STEP_MS.
const COUNTDOWN_STEP_MS = 700;

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function CountdownOverlay({ value }: { value: number }) {
  return (
    <div className="local-room-countdown" role="status" aria-live="assertive">
      <span key={value} className="local-room-countdown__value">
        {value > 0 ? value : "Vai!"}
      </span>
    </div>
  );
}

// Um portal direto pro <body>, não pro elemento pai mais próximo, porque
// qualquer ancestral com transform (como o hover de .module-panel) vira um
// "containing block" e faz position:fixed grudar nele em vez da tela toda.
function LocalRoomFullscreen({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const root = document.getElementById("root");
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    ref.current?.focus();
    return () => {
      if (root) root.inert = wasInert;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <div
      ref={ref}
      className="local-room-fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label="Modo Sala"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
          ) ?? [],
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

type LocalRoomProps = {
  initialJoinCode?: string | undefined;
  projectorMode?: boolean;
  onExit?: () => void;
  materials?: { id: string; name: string; cards: { id: string; front: string; back: string }[] }[];
};

function ShareRoom({ code }: { code: string }) {
  const [copyStatus, setCopyStatus] = useState("");
  const joinUrl = buildLocalRoomJoinUrl(window.location.href, code);

  async function copy(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(success);
    } catch {
      setCopyStatus("Não foi possível copiar.");
    }
    window.setTimeout(() => setCopyStatus(""), 2500);
  }

  return (
    <div className="local-room-share">
      <div className="local-room-share__heading">
        <h3>Convide seus alunos</h3>
        <p>Todo mundo começa por aqui.</p>
      </div>
      <div className="local-room-share__code">
        <strong aria-label="Código da sala">{code}</strong>
        <button
          className="icon-button"
          type="button"
          onClick={() => void copy(code, "Código copiado ✓")}
          aria-label="Copiar código da sala"
        >
          <Copy size={17} />
        </button>
      </div>
      <details className="local-room-share__qr" open>
        <summary>Mostrar ou recolher QR code</summary>
        <RoomQrCode value={joinUrl} />
      </details>
      <div className="local-room-share__link">
        <p>Escaneie o QR code ou compartilhe o convite.</p>
        <input aria-label="Link da sala" value={joinUrl} readOnly />
        <div className="local-room-share__actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => void copy(joinUrl, "Link copiado ✓")}
          >
            <Copy size={16} /> Copiar link
          </button>
        </div>
        <p className="local-room-copy-status" role="status" aria-live="polite">
          {copyStatus}
        </p>
      </div>
    </div>
  );
}

function LobbyParticipants({ participants }: { participants: readonly LocalRoomParticipant[] }) {
  return (
    <ul className="local-room-participant-list">
      {participants.map((participant, index) => (
        <li key={participant.id}>
          <span
            className={`local-room-avatar local-room-avatar--${(index % 4) + 1}`}
            aria-hidden="true"
          >
            {participant.displayName.slice(0, 2).toUpperCase()}
          </span>
          <span className="local-room-participant-list__name">{participant.displayName}</span>
          <small className={participant.online === false ? "is-offline" : ""}>
            <span aria-hidden="true" />
            {participant.online === false ? "Ausente" : "Conectado"}
          </small>
        </li>
      ))}
    </ul>
  );
}

function Scoreboard({ participants }: { participants: readonly LocalRoomParticipant[] }) {
  const ranked = rankLocalRoomParticipants(participants);
  return (
    <ol className="local-room-scoreboard">
      {ranked.map((participant, index) => (
        <li key={participant.id}>
          <span className="local-room-scoreboard__rank">{index + 1}</span>
          <span>
            {participant.displayName}
            {participant.team ? ` · ${participant.team}` : ""}
            {participant.online === false ? " · ausente" : ""}
          </span>
          <strong>
            {participant.score} <NavigationIcon name="xp" />
          </strong>
        </li>
      ))}
    </ol>
  );
}

function Podium({ participants }: { participants: readonly LocalRoomParticipant[] }) {
  const ranked = rankLocalRoomParticipants(participants);
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  return (
    <>
      <ol className="local-room-podium">
        {top3.map((participant, index) => (
          <li
            className={`local-room-podium__place local-room-podium__place--${index + 1}`}
            key={participant.id}
          >
            <NavigationIcon name={MEDAL_ICON_BY_RANK[index]!} />
            <span>{participant.displayName}</span>
            <strong>
              {participant.score} <NavigationIcon name="xp" />
            </strong>
          </li>
        ))}
      </ol>
      {rest.length > 0 && <Scoreboard participants={rest} />}
    </>
  );
}

function ProjectorRoom({
  state,
  connectionLabel,
  connectionStatus,
  secondsLeft,
}: {
  state: PublicLocalRoomState;
  connectionLabel: string;
  connectionStatus: RoomConnectionStatus;
  secondsLeft: number;
}) {
  const connected = state.participants.filter((participant) => participant.online !== false);
  const joinUrl = buildLocalRoomJoinUrl(window.location.origin, state.code);

  return (
    <div className="local-room-projector">
      <header className="local-room-projector__header">
        <div>
          <span>Sala</span>
          <strong>{state.code}</strong>
        </div>
        <p className={`local-room-connection local-room-connection--${connectionStatus}`}>
          <span aria-hidden="true" /> {connectionLabel}
        </p>
        <p>
          <Users size={22} /> {countLabel(connected.length, "participante", "participantes")}
        </p>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void document.documentElement.requestFullscreen?.()}
        >
          <Maximize2 size={20} /> Tela cheia
        </button>
      </header>

      {state.phase === "lobby" ? (
        <main className="local-room-projector__lobby">
          <div>
            <span>Entre na sala</span>
            <strong>{state.code}</strong>
            <p>Aponte a câmera para o QR code.</p>
          </div>
          <RoomQrCode value={joinUrl} />
        </main>
      ) : state.phase === "playing" ? (
        <main className="local-room-projector__round">
          <div className="local-room-round__progress">
            <span>
              Pergunta {state.questionIndex + 1} de {state.totalQuestions}
            </span>
            <span className="local-room-round__timer">
              <NavigationIcon name="timer" /> {secondsLeft}s
            </span>
          </div>
          <div className="local-room-projector__prompt">
            <NavigationIcon
              name={state.settings.activity === "bingo" ? "activity-bank" : "focus"}
            />
            <h1>
              {state.settings.activity === "bingo" ? "Marque sua cartela" : "Ouça com atenção"}
            </h1>
            <p>
              {state.answeredParticipantIds.length} de {connected.length} respostas recebidas
            </p>
          </div>
          {state.settings.allowLateJoin && (
            <aside className="local-room-projector__late-join" aria-label="Entrada na sala">
              <RoomQrCode value={joinUrl} />
              <div>
                <span>Entrada aberta</span>
                <strong>{state.code}</strong>
              </div>
            </aside>
          )}
          <Scoreboard participants={state.participants} />
        </main>
      ) : (
        <main className="local-room-projector__results">
          <NavigationIcon name="medal-first" />
          <h1>{state.phase === "finished" ? "Sala encerrada" : "Resultado da turma"}</h1>
          <Podium participants={state.participants} />
        </main>
      )}
    </div>
  );
}

export function LocalRoom({
  initialJoinCode,
  projectorMode = false,
  onExit,
  materials = [],
}: LocalRoomProps) {
  const room = useLocalRoom(initialJoinCode);
  const [code, setCode] = useState(initialJoinCode ?? "");
  const [name, setName] = useState("");
  const [manualWords, setManualWords] = useState("");
  const [manualMode, setManualMode] = useState(true);
  const [appliedManualWords, setAppliedManualWords] = useState("");
  const [manualApplyStatus, setManualApplyStatus] = useState("");
  const [revealHostWord, setRevealHostWord] = useState(false);
  const [confirmRevealHostWord, setConfirmRevealHostWord] = useState(false);
  const [answer, setAnswer] = useState("");
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [lastResult, setLastResult] = useState<
    (LocalRoomAnswerFeedback & { submittedAnswer: string }) | undefined
  >(undefined);
  const state = room.state;
  const [naturalState, setNaturalState] = useState<NaturalVoiceState>({ status: "idle" });
  const naturalPlayerRef = useRef<NaturalVoicePlayer | undefined>(undefined);
  const audioPlayCountRef = useRef(0);
  const countdownAudioQuestionRef = useRef<string | undefined>(undefined);
  const countdownHasRenderedRef = useRef(false);
  const [replayCooldownUntil, setReplayCooldownUntil] = useState(0);
  const [replayCooldownSeconds, setReplayCooldownSeconds] = useState(0);

  const online = useListeningOnline();
  const isAllowed = online.isAllowed;

  useEffect(() => {
    // O texto das frases só vai à empresa de voz se a pessoa tiver aceitado neste aparelho.
    const player = new NaturalVoicePlayer(setNaturalState, isAllowed);
    naturalPlayerRef.current = player;
    return () => player.dispose();
  }, [isAllowed]);

  function playQuestionAudio(text: string) {
    const limit = state?.settings.audioRepetitions ?? "unlimited";
    if (limit !== "unlimited" && audioPlayCountRef.current >= limit) {
      setNaturalState({ status: "error", message: `Limite de ${limit} reproduções atingido.` });
      return;
    }
    audioPlayCountRef.current += 1;
    const rate = state?.settings.audioRate ?? 1;
    void naturalPlayerRef.current?.generate(text, rate, () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      speakEnglish(text, {
        voice: selectFallbackEnglishVoice(voices),
        rate,
        onUnavailable: () => {},
      });
    });
  }

  function replayQuestionAudio(text: string) {
    if (Date.now() < replayCooldownUntil) return;
    playQuestionAudio(text);
    const cooldownUntil = Date.now() + AUDIO_REPLAY_COOLDOWN_MS;
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
  useEffect(() => {
    // Uma pergunta nova nao deve tocar a reproducao (ou pedido de audio) da
    // pergunta anterior por cima; ja aproveita pra pedir o audio dela com
    // antecedencia, antes de alguem clicar em "Ouvir".
    audioPlayCountRef.current = 0;
    naturalPlayerRef.current?.stop();
    if (currentQuestionFront)
      naturalPlayerRef.current?.preload(currentQuestionFront, state?.settings.audioRate ?? 1);
  }, [questionKey, currentQuestionFront, state?.settings.audioRate]);

  const participantCount = state?.participants.length ?? 0;
  const canJoin = !room.busy && isValidLocalRoomCode(code) && name.trim().length > 0;

  const isPlaying = state?.phase === "playing";
  const questionStartedAt = state?.questionStartedAt ?? 0;
  const roundSeconds = state?.settings.roundSeconds ?? 30;
  const [secondsLeft, setSecondsLeft] = useState(() =>
    state ? roomSecondsLeft(state, Date.now()) : roundSeconds,
  );

  // Modo Sala toma a tela toda enquanto estiver aberto, pra ficar bem
  // visível projetado ou compartilhado. Some de novo assim que a pessoa
  // troca de aba/modo e este componente é desmontado.
  useEffect(() => {
    document.body.classList.add("local-room-active");
    return () => {
      document.body.classList.remove("local-room-active");
    };
  }, []);

  // Contagem regressiva (3, 2, 1, Vai!) antes da primeira pergunta de cada
  // sala. Dispara só na transição do lobby pra a rodada, nunca de novo
  // entre perguntas nem se a pessoa entrar com a sala já em andamento.
  const previousPhaseRef = useRef(state?.phase);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = state?.phase;
    if (
      (previousPhase === "lobby" || previousPhase === "results") &&
      state?.phase === "playing" &&
      state.questionIndex === 0
    ) {
      countdownAudioQuestionRef.current = questionKey;
      countdownHasRenderedRef.current = false;
      setCountdownValue(3);
    }
  }, [questionKey, state?.phase, state?.questionIndex]);
  useEffect(() => {
    if (countdownValue === null) return;
    const timer = window.setTimeout(() => {
      setCountdownValue((current) => (current === null || current <= 0 ? null : current - 1));
    }, COUNTDOWN_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [countdownValue]);

  useEffect(() => {
    if (!currentQuestionFront || state?.phase !== "playing" || projectorMode) return;
    if (countdownAudioQuestionRef.current === questionKey) {
      if (countdownValue !== null) {
        countdownHasRenderedRef.current = true;
        return;
      }
      if (!countdownHasRenderedRef.current) return;
      countdownAudioQuestionRef.current = undefined;
    }
    if (state.settings.autoPlayAudio) playQuestionAudio(currentQuestionFront);
    // Uma pergunta nova ou o fim da contagem são os únicos gatilhos automáticos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownValue, currentQuestionFront, projectorMode, questionKey, state?.phase]);

  useEffect(() => {
    if (!replayCooldownUntil) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((replayCooldownUntil - Date.now()) / 1000));
      setReplayCooldownSeconds(remaining);
      if (!remaining) setReplayCooldownUntil(0);
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [replayCooldownUntil]);

  // Só o navegador do organizador tenta avançar quando o tempo acaba.
  // O intervalo curto também corrige pequenas diferenças entre relógios.
  useEffect(() => {
    if (!isPlaying) return;
    let advancing = false;
    const tick = () => {
      const remaining = state ? roomSecondsLeft(state, Date.now()) : 0;
      setSecondsLeft(remaining);
      const activeIds =
        state?.participants
          .filter((participant) => participant.online !== false)
          .map((participant) => participant.id) ?? [];
      const allAnswered =
        activeIds.length > 0 && activeIds.every((id) => state?.answeredParticipantIds.includes(id));
      if (remaining === 0 && room.isHost && !projectorMode && !allAnswered && !advancing) {
        advancing = true;
        void room.nextQuestion().finally(() => {
          advancing = false;
        });
      }
    };
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, projectorMode, questionStartedAt, roundSeconds, room.isHost, state]);

  const activeParticipantIds = state?.participants
    .filter((participant) => participant.online !== false)
    .map((participant) => participant.id);
  const everyoneAnswered =
    Boolean(activeParticipantIds?.length) &&
    activeParticipantIds!.every((id) => state?.answeredParticipantIds.includes(id));
  useEffect(() => {
    if (!isPlaying || !room.isHost || projectorMode || !everyoneAnswered) return;
    const timer = window.setTimeout(() => void room.nextQuestion(), ANSWER_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [everyoneAnswered, isPlaying, projectorMode, questionStartedAt, room.isHost]);

  function joinRoom(event: FormEvent) {
    event.preventDefault();
    void room.joinRoom(code, name);
  }

  async function submitAnswer(event: FormEvent) {
    event.preventDefault();
    if (!state?.currentQuestion || !answer.trim() || isSubmittingAnswer) return;
    setIsSubmittingAnswer(true);
    const submittedAnswer = answer.trim();
    try {
      const result = await room.submitAnswer(state.questionIndex, submittedAnswer);
      if (result) setLastResult({ ...result, submittedAnswer });
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

  function exitRoom() {
    room.reset();
    onExit?.();
  }

  function selectActivity(activity: "listening" | "bingo") {
    if (activity === "bingo") {
      setManualMode(false);
      void room.updateSettings({
        activity,
        subjectName: "",
        category: "",
        difficulty: "mixed",
      });
      return;
    }
    void room.updateSettings({ activity });
  }

  if (room.isRestoring)
    return (
      <LocalRoomFullscreen>
        <div className="local-room-restoring" role="status" aria-live="polite">
          <Radio size={34} aria-hidden="true" />
          <h3>Retomando sala…</h3>
          <p>Reconectando você à atividade em andamento.</p>
        </div>
      </LocalRoomFullscreen>
    );

  if (projectorMode && (!state || !room.isHost))
    return (
      <LocalRoomFullscreen>
        <div className="local-room-restoring" role="alert">
          <MonitorUp size={34} aria-hidden="true" />
          <h3>Modo projetor protegido</h3>
          <p>Abra esta tela pelo painel do professor que criou a sala.</p>
        </div>
      </LocalRoomFullscreen>
    );

  if (room.role === "choose")
    return (
      <LocalRoomFullscreen>
        {onExit && (
          <button
            className="icon-button local-room-back"
            type="button"
            onClick={onExit}
            aria-label="Voltar"
          >
            <HelenaRoomIcon name="back" />
          </button>
        )}
        <div className="local-room-intro">
          <Radio size={34} />
          <div>
            <h3>Modo Sala</h3>
            <p>Cada aluno entra pelo próprio celular com um código de cinco letras.</p>
          </div>
          <div className="local-room-intro__actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => void room.createRoom(DEFAULT_SETTINGS)}
              disabled={room.busy}
            >
              <Users size={17} /> Criar sala
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => room.setRole("participant")}
            >
              <DoorOpen size={17} /> Entrar com código
            </button>
          </div>
          {room.error && <p role="alert">{room.error}</p>}
        </div>
      </LocalRoomFullscreen>
    );

  if (room.role === "participant" && !state)
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
          <p>Peça o código de cinco letras para o professor e digite seu nome.</p>
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
          <label>
            <span>Nome de exibição</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              required
            />
          </label>
          {room.error && <p role="alert">{room.error}</p>}
          <button className="primary-button" type="submit" disabled={!canJoin}>
            Entrar
          </button>
        </form>
      </LocalRoomFullscreen>
    );

  if (!state) return null;
  const isHost = room.isHost;
  const answered = state.answeredParticipantIds.includes(room.participantId);
  const questionCount = state.settings.questionCount;
  const pool = localRoomPool(state.settings);
  const availableCount = state.content?.count ?? pool.length;
  const manualInput = parseManualListeningInput(manualWords);
  const manualDeck = manualInput.cards;
  const manualErrors = manualInput.lines.filter((line) => line.error);
  const manualDeckIsValid = manualDeck.length > 0 && manualErrors.length === 0;
  const usesManualList = state.settings.activity !== "bingo" && manualMode;
  const manualSelectionPending =
    usesManualList &&
    (!manualWords.trim() ||
      state.settings.subjectName !== MANUAL_LISTENING_SOURCE ||
      appliedManualWords !== manualWords);
  const actualCount = usesManualList
    ? manualDeck.length
    : questionCount === "all"
      ? availableCount
      : Math.min(questionCount, availableCount);
  const estimatedDuration = formatRoomEstimatedDuration(actualCount, roundSeconds);
  const ownParticipant = state.participants.find((p) => p.id === room.participantId);
  const teamScores = ["Roxo", "Amarelo"].map((team) => ({
    team,
    score: state.participants.filter((p) => p.team === team).reduce((sum, p) => sum + p.score, 0),
  }));
  const connectionLabel =
    room.connectionStatus === "online"
      ? "Online"
      : room.connectionStatus === "offline"
        ? "Sem conexão"
        : room.connectionStatus === "reconnecting"
          ? "Reconectando…"
          : "Conectando…";

  if (projectorMode)
    return (
      <LocalRoomFullscreen>
        <ProjectorRoom
          state={state}
          connectionLabel={connectionLabel}
          connectionStatus={room.connectionStatus}
          secondsLeft={secondsLeft}
        />
      </LocalRoomFullscreen>
    );

  return (
    <LocalRoomFullscreen>
      {countdownValue !== null && <CountdownOverlay value={countdownValue} />}
      <div className={`local-room-session local-room-session--${state.phase}`}>
        <header className="local-room-session__header">
          <div className="local-room-session__code">
            <span>Sala</span>
            <strong>{state.code}</strong>
          </div>
          <div className="local-room-session__actions">
            <p className={`local-room-connection local-room-connection--${room.connectionStatus}`}>
              <span aria-hidden="true" /> {connectionLabel}
            </p>
            <p>
              <Users size={16} /> <strong>{state.participants.length}</strong>{" "}
              <span className="local-room-participant-noun">
                {state.participants.length === 1 ? "participante" : "participantes"}
              </span>
            </p>
            <span className="local-room-theme-toggle">
              <ThemeToggle />
            </span>
            {isHost && (
              <button
                className="secondary-button local-room-open-projector"
                type="button"
                onClick={openProjector}
              >
                <MonitorUp size={18} /> Abrir modo projetor
              </button>
            )}
            <button className="secondary-button" type="button" onClick={exitRoom}>
              <HelenaRoomIcon name="close" size={18} /> Sair da sala
            </button>
          </div>
        </header>
        <p className="local-note" role="status" aria-live="polite">
          {countLabel(
            state.participants.filter((p) => p.online !== false).length,
            "participante conectado",
            "participantes conectados",
          )}{" "}
          · {connectionLabel}
        </p>
        {room.error && <p role="alert">{room.error}</p>}
        {state.settings.teams && (
          <p aria-label="Placar por equipe">
            {teamScores.map((t) => `${t.team}: ${t.score} XP`).join(" · ")}
          </p>
        )}

        {state.phase === "lobby" ? (
          isHost ? (
            <div className="local-room-lobby">
              <div className="local-room-lobby__invite">
                <ShareRoom code={state.code} />
                <section className="local-room-participants" aria-labelledby="participants-title">
                  <div className="local-room-section-heading">
                    <h3 id="participants-title">Participantes</h3>
                    <span>
                      {participantCount}/{MAX_ROOM_PARTICIPANTS}
                    </span>
                  </div>
                  {participantCount === 0 ? (
                    <div className="local-room-participants__empty">
                      <div aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </div>
                      <strong>Aguardando participantes…</strong>
                      <p>Compartilhe o código {state.code}. A rodada começa com uma pessoa.</p>
                    </div>
                  ) : (
                    <LobbyParticipants participants={state.participants} />
                  )}
                </section>
              </div>

              <div className="local-room-settings">
                <div className="local-room-settings__heading">
                  <h2>Escolha uma atividade</h2>
                  <p>Uma nova experiência, sem trocar de sala.</p>
                </div>
                <div
                  className="local-room-activities"
                  role="radiogroup"
                  aria-label="Atividades da sala"
                >
                  {ROOM_ACTIVITY_OPTIONS.map((activity) => (
                    <button
                      className="local-room-activity"
                      type="button"
                      disabled={!activity.enabled}
                      role="radio"
                      aria-checked={
                        activity.enabled &&
                        (state.settings.activity ?? "listening") === activity.key
                      }
                      onClick={() => activity.enabled && selectActivity(activity.key)}
                      key={activity.key}
                    >
                      <span className="local-room-activity__icon">
                        <NavigationIcon name={activity.icon} />
                      </span>
                      {"badge" in activity && (
                        <span className="local-room-activity__badge">{activity.badge}</span>
                      )}
                      <strong>{activity.title}</strong>
                    </button>
                  ))}
                </div>
                <div className="local-room-settings__panel">
                  <h3>
                    {state.settings.activity === "bingo" ? "Prepare o bingo" : "Prepare a escuta"}
                  </h3>
                  <label>
                    <span>Material da sala</span>
                    <select
                      value={
                        manualMode ? MANUAL_LISTENING_SOURCE : (state.settings.subjectName ?? "")
                      }
                      onChange={(event) => {
                        if (event.target.value === MANUAL_LISTENING_SOURCE) {
                          setManualMode(true);
                          return;
                        }
                        setManualMode(false);
                        const material = materials.find((item) => item.name === event.target.value);
                        void room.updateSettings(
                          { subjectName: material?.name ?? "", difficulty: "mixed", category: "" },
                          material?.cards.slice(0, 30) ?? [],
                        );
                      }}
                    >
                      <option value="">Modelo básico</option>
                      <option value={MANUAL_LISTENING_SOURCE}>Lista personalizada</option>
                      {materials
                        .filter((item) => item.cards.length)
                        .map((item) => (
                          <option key={item.id} value={item.name}>
                            {item.name} · meus cartões
                          </option>
                        ))}
                    </select>
                  </label>
                  {(manualMode || state.settings.subjectName === MANUAL_LISTENING_SOURCE) &&
                    state.settings.activity !== "bingo" && (
                      <div className="local-room-manual">
                        <div>
                          <strong>Lista personalizada</strong>
                          <span>
                            {manualDeck.length} válidas
                            {manualErrors.length > 0
                              ? ` · ${manualErrors.length} precisam de correção`
                              : ""}
                          </span>
                        </div>
                        <label htmlFor="local-room-manual-words">
                          Digite ou cole palavras e traduções. Use =, ;, vírgula, tabulação ou
                          hífen. Separe respostas equivalentes com |.
                        </label>
                        <textarea
                          id="local-room-manual-words"
                          value={manualWords}
                          onChange={(event) => {
                            setManualWords(event.target.value);
                            setManualApplyStatus("");
                          }}
                          placeholder={"bus = ônibus | autocarro\nschool = escola\nbook = livro"}
                          rows={6}
                          spellCheck={false}
                        />
                        {manualErrors.length > 0 && (
                          <ul className="local-room-manual__errors" aria-live="polite">
                            {manualErrors.map((line) => (
                              <li key={line.lineNumber}>
                                Linha {line.lineNumber}: {line.error}.
                              </li>
                            ))}
                          </ul>
                        )}
                        {manualDeck.length > 0 && (
                          <div
                            className="local-room-manual__preview"
                            aria-label="Prévia das palavras"
                          >
                            {manualDeck.slice(0, 6).map((card) => (
                              <span key={card.id}>
                                {card.front} →{" "}
                                {[card.back, ...(card.acceptedAnswers ?? [])].join(" | ")}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="local-room-manual__action">
                          <p aria-live="polite">
                            {manualApplyStatus ||
                              (manualSelectionPending && manualWords.trim()
                                ? "● Alterações ainda não aplicadas"
                                : manualDeckIsValid
                                  ? `${countLabel(manualDeck.length, "palavra pronta", "palavras prontas")} para aplicar.`
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
                                  manualDeck,
                                )
                                .then((saved) => {
                                  if (!saved) return;
                                  setAppliedManualWords(manualWords);
                                  setManualApplyStatus(
                                    `${countLabel(manualDeck.length, "palavra adicionada", "palavras adicionadas")} à rodada ✓`,
                                  );
                                });
                            }}
                          >
                            {manualApplyStatus ? "Palavras aplicadas ✓" : "Aplicar palavras"}
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
                      <option value="bingo">Bingo de vocabulário</option>
                    </select>
                  </label>
                  {!usesManualList && (
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
                  <label>
                    <span>Respostas</span>
                    <select
                      value={state.settings.teams ? "teams" : "individual"}
                      onChange={(event) =>
                        void room.updateSettings({ teams: event.target.value === "teams" })
                      }
                    >
                      <option value="individual">Individuais</option>
                      <option value="teams">Equipes Roxo e Amarelo · soma dos pontos</option>
                    </select>
                  </label>
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
                  <label>
                    <input
                      type="checkbox"
                      checked={state.settings.allowLateJoin ?? false}
                      onChange={(event) =>
                        void room.updateSettings({ allowLateJoin: event.target.checked })
                      }
                    />{" "}
                    Permitir entrada após iniciar
                  </label>
                  {state.settings.activity !== "bingo" && (
                    <label>
                      <input
                        type="checkbox"
                        checked={state.settings.acceptMinorTypos ?? false}
                        onChange={(event) =>
                          void room.updateSettings({ acceptMinorTypos: event.target.checked })
                        }
                      />{" "}
                      Aceitar um pequeno erro de digitação
                    </label>
                  )}
                  {!usesManualList && (
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
                  {usesManualList ? (
                    <p className="local-room-manual__quantity">
                      Quantidade: {manualDeck.length || availableCount} · todas as palavras
                    </p>
                  ) : (
                    <label>
                      <span>Perguntas</span>
                      <select
                        value={state.settings.questionCount}
                        onChange={(event) =>
                          void room.updateSettings({
                            questionCount:
                              event.target.value === "all"
                                ? "all"
                                : (Number(event.target.value) as 5 | 10 | 15),
                          })
                        }
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="15">15</option>
                        <option value="all">Todas</option>
                      </select>
                    </label>
                  )}
                  <label>
                    <span>Tempo por pergunta</span>
                    <select
                      value={state.settings.roundSeconds}
                      onChange={(event) =>
                        void room.updateSettings({
                          roundSeconds: Number(
                            event.target.value,
                          ) as LocalRoomSettings["roundSeconds"],
                        })
                      }
                    >
                      <option value="15">15s</option>
                      <option value="30">30s</option>
                      <option value="45">45s</option>
                      <option value="60">60s</option>
                    </select>
                  </label>
                  {state.settings.activity !== "bingo" && (
                    <details className="listening-audio-settings">
                      <summary>Configurações de áudio</summary>
                      <ListeningOnlineNotice
                        choice={online.choice}
                        onChoose={online.choose}
                        variant="compact"
                      />
                      <div className="local-room-audio-settings-grid">
                        <label>
                          <span>Repetições permitidas</span>
                          <select
                            value={state.settings.audioRepetitions ?? "unlimited"}
                            onChange={(event) =>
                              void room.updateSettings({
                                audioRepetitions:
                                  event.target.value === "unlimited"
                                    ? "unlimited"
                                    : (Number(event.target.value) as 1 | 2 | 3),
                              })
                            }
                          >
                            <option value="unlimited">Ilimitadas</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                          </select>
                        </label>
                        <label>
                          <span>Velocidade</span>
                          <select
                            value={state.settings.audioRate ?? 1}
                            onChange={(event) =>
                              void room.updateSettings({
                                audioRate: Number(event.target.value) as 0.75 | 1,
                              })
                            }
                          >
                            <option value="0.75">0,75×</option>
                            <option value="1">1×</option>
                          </select>
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={state.settings.autoPlayAudio ?? false}
                            onChange={(event) =>
                              void room.updateSettings({ autoPlayAudio: event.target.checked })
                            }
                          />{" "}
                          Reproduzir automaticamente
                        </label>
                        <p>Voz em inglês americano, com alternativa do dispositivo.</p>
                      </div>
                    </details>
                  )}
                  <div className="local-room-summary" aria-label="Resumo da rodada">
                    <strong>
                      {state.settings.activity === "bingo" ? "Bingo" : "Quiz de escuta"} ·{" "}
                      {state.settings.subjectName || "vocabulário em inglês"}
                    </strong>
                    <p>
                      {countLabel(actualCount, "pergunta", "perguntas")} ·{" "}
                      {state.settings.roundSeconds}s cada
                      {actualCount ? ` · cerca de ${estimatedDuration}` : ""}
                    </p>
                    <small>
                      {state.settings.teams ? "Equipes" : "Respostas individuais"} ·{" "}
                      {state.settings.shuffle === false ? "ordem do catálogo" : "ordem embaralhada"}{" "}
                      ·{" "}
                      {state.settings.allowLateJoin ? "entrada aberta" : "entrada fecha ao iniciar"}
                    </small>
                  </div>
                  {room.error && <p role="alert">{room.error}</p>}
                </div>
              </div>
              <div className="local-room-action-bar">
                <div>
                  <strong>
                    {state.settings.activity === "bingo" ? "Bingo" : "Escuta coletiva"}
                  </strong>
                  <p>
                    {countLabel(actualCount, "pergunta", "perguntas")},{" "}
                    {state.settings.roundSeconds}s cada, cerca de {estimatedDuration}
                  </p>
                </div>
                <span>
                  {countLabel(participantCount, "participante pronto", "participantes prontos")}
                </span>
                <div>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={
                      participantCount === 0 || availableCount === 0 || manualSelectionPending
                    }
                    onClick={() => void room.startRound()}
                    aria-describedby={
                      participantCount === 0 || manualSelectionPending
                        ? "local-room-start-help"
                        : undefined
                    }
                  >
                    <HelenaRoomIcon name="play" size={18} /> Iniciar atividade
                  </button>
                  {(participantCount === 0 || manualSelectionPending) && (
                    <small id="local-room-start-help">
                      {participantCount === 0
                        ? "Aguarde pelo menos um aluno entrar"
                        : "Aplique as palavras antes de iniciar"}
                    </small>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="local-room-waiting" role="status">
              <Radio size={28} />
              <h3>Aguardando o início</h3>
              <p>O organizador controla esta sala. Código: {state.code}</p>
              {state.settings.activity !== "bingo" && (
                <ListeningOnlineNotice
                  choice={online.choice}
                  onChoose={online.choose}
                  variant="compact"
                />
              )}
            </div>
          )
        ) : state.phase === "playing" && state.currentQuestion ? (
          <div className="local-room-round">
            <div className="local-room-round__progress">
              <span>
                Pergunta {state.questionIndex + 1} de {state.totalQuestions}
              </span>
              <span className="local-room-round__timer">
                <NavigationIcon name="timer" /> {secondsLeft}s
              </span>
            </div>
            {isHost ? (
              <>
                <div className="local-room-round__host-question">
                  <Volume2 size={20} />
                  <span>{revealHostWord ? state.currentQuestion.front : "Áudio reproduzido"}</span>
                </div>
                <button
                  className="secondary-button local-room-host-audio"
                  type="button"
                  onClick={() => playQuestionAudio(state.currentQuestion!.front)}
                >
                  <Volume2 size={18} /> Reproduzir áudio
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
                <p>
                  {state.answeredParticipantIds.length} de {state.participants.length} já
                  responderam. Quando todos responderem, o resultado permanece por três segundos.
                </p>
                <Scoreboard participants={state.participants} />
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void room.endRoom()}
                >
                  Encerrar sala
                </button>
              </>
            ) : state.settings.activity === "bingo" ? (
              <div className="local-room-bingo">
                <h3>Complete sua cartela</h3>
                <p>
                  Ouça a palavra e marque a tradução correspondente. Vence quem completar a cartela.
                </p>
                <button
                  className="secondary-button"
                  onClick={() => playQuestionAudio(state.currentQuestion!.front)}
                >
                  <Volume2 size={18} /> Ouvir palavra
                </button>
                {naturalState.message && naturalState.status !== "ready" && (
                  <p className="local-room-audio-status" role="status">
                    {naturalState.message}
                  </p>
                )}
                <div className="local-room-bingo-grid">
                  {(ownParticipant?.bingoCard ?? []).map((id) => (
                    <button
                      key={id}
                      className="secondary-button"
                      aria-pressed={ownParticipant?.bingoMarks?.includes(id) ?? false}
                      disabled={
                        answered || secondsLeft === 0 || ownParticipant?.bingoMarks?.includes(id)
                      }
                      onClick={() => void room.submitAnswer(state.questionIndex, id)}
                    >
                      {state.bingoWords?.find((word) => word.id === id)?.text ?? id}
                      {ownParticipant?.bingoMarks?.includes(id) ? " ✓" : ""}
                    </button>
                  ))}
                </div>
                <button
                  className="secondary-button"
                  disabled={answered || secondsLeft === 0}
                  onClick={() => void room.submitAnswer(state.questionIndex, "pass")}
                >
                  Não está na minha cartela
                </button>
              </div>
            ) : answered ? (
              <div
                className={`local-room-answer-feedback ${lastResult?.correct ? "is-correct" : "is-wrong"}`}
                role="status"
                aria-live="polite"
              >
                {lastResult?.correct ? <Check size={28} /> : <Radio size={28} />}
                <h3>{lastResult?.correct ? "Correto!" : "Ainda não foi dessa vez"}</h3>
                {!lastResult?.correct && lastResult?.submittedAnswer && (
                  <p>
                    Você respondeu: <strong>{lastResult.submittedAnswer}</strong>
                  </p>
                )}
                {lastResult?.question && (
                  <div className="local-room-answer-feedback__pair">
                    <strong>{lastResult.question.front}</strong>
                    <span>{lastResult.question.back}</span>
                  </div>
                )}
                {lastResult && lastResult.xpChange !== 0 && (
                  <p className="local-room-xp-feedback">
                    <NavigationIcon name="xp" /> {lastResult.xpChange > 0 ? "+" : ""}
                    {lastResult.xpChange} XP
                  </p>
                )}
                {lastResult?.question && (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={replayCooldownSeconds > 0 || naturalState.status === "generating"}
                    onClick={() => replayQuestionAudio(lastResult.question!.front)}
                  >
                    <Volume2 size={18} />
                    {replayCooldownSeconds > 0
                      ? `Ouvir novamente em ${replayCooldownSeconds}s`
                      : "Ouvir novamente"}
                  </button>
                )}
                {everyoneAnswered ? (
                  <div className="local-room-feedback-countdown">
                    <p>Próxima pergunta em 3 segundos.</p>
                    <span aria-hidden="true">
                      <i />
                    </span>
                  </div>
                ) : (
                  <div className="local-room-answer-received">
                    <strong>Resposta recebida ✓</strong>
                    <p>Aguardando a turma.</p>
                  </div>
                )}
              </div>
            ) : (
              <form className="local-room-answer" onSubmit={submitAnswer}>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={replayCooldownSeconds > 0 || naturalState.status === "generating"}
                  onClick={() => replayQuestionAudio(state.currentQuestion!.front)}
                >
                  <Volume2 size={18} />
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
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    disabled={isSubmittingAnswer}
                    autoFocus
                  />
                </label>
                <button
                  className="primary-button local-room-answer__submit"
                  type="submit"
                  disabled={isSubmittingAnswer}
                >
                  {isSubmittingAnswer ? "Enviando…" : "Responder"}
                </button>
                {isSubmittingAnswer && <HelenaLoading compact label="Enviando resposta…" />}
              </form>
            )}
          </div>
        ) : state.phase === "results" ? (
          <div className="local-room-finished">
            <div className="local-room-waiting" role="status">
              <NavigationIcon name="medal-first" />
              <h3>Atividade concluída</h3>
            </div>
            <Podium participants={state.participants} />
            {room.isHost ? (
              <div className="local-room-results-actions">
                <button className="primary-button" type="button" onClick={room.repeatRound}>
                  <HelenaRoomIcon name="play" size={18} /> Repetir
                </button>
                <button className="secondary-button" type="button" onClick={room.returnToLobby}>
                  Trocar atividade
                </button>
                <button className="secondary-button" type="button" onClick={room.endRoom}>
                  <HelenaRoomIcon name="close" size={18} /> Encerrar sala
                </button>
              </div>
            ) : (
              <div className="local-room-answer-received" role="status">
                <strong>Atividade concluída ✓</strong>
                <p>Aguardando a próxima escolha do professor.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="local-room-finished">
            <div className="local-room-waiting" role="status">
              <HelenaRoomIcon name="close" size={24} />
              <h3>Sala encerrada</h3>
            </div>
            <Podium participants={state.participants} />
            <button className="secondary-button" type="button" onClick={room.reset}>
              Sair
            </button>
          </div>
        )}
      </div>
    </LocalRoomFullscreen>
  );
}
