import type { LocalRoomSettings } from "../domain/local-room";
import { READY_LISTENING_SOURCE } from "../domain/ready-listening-words";

export const DEFAULT_SETTINGS: LocalRoomSettings = {
  difficulty: "mixed",
  questionCount: "all",
  roundSeconds: 30,
  subjectName: READY_LISTENING_SOURCE,
  readyWordIds: [],
  audioRepetitions: "unlimited",
  autoPlayAudio: true,
  participantAudio: false,
  recordedAudioRequired: true,
};
export const HELENA_WORD_STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const;

export const ROOM_ACTIVITY_OPTIONS = [
  {
    key: "listening",
    title: "Escuta coletiva",
    description: "Reproduza áudios e receba respostas em tempo real.",
    badge: "Recomendado",
    enabled: true,
  },
  {
    key: "flashcards",
    title: "Flashcards em grupo",
    description: "Revise conceitos e acompanhe o domínio da turma.",
    badge: "Em breve",
    enabled: false,
  },
  {
    key: "quiz",
    title: "Quiz competitivo",
    description: "Perguntas com tempo, pontuação e ranking.",
    badge: "Em breve",
    enabled: false,
  },
  {
    key: "bingo",
    title: "Bingo",
    description: "Cartelas individuais e sorteio sincronizado.",
    enabled: true,
  },
] as const;

export const MANUAL_LISTENING_SOURCE = "Lista personalizada";
export const AUDIO_REPLAY_COOLDOWN_MS = 5_000;
export const TIME_STEPS = [5, 10, 15, 30] as const;

export function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}
