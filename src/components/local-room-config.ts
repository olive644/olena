import { uiText, localizeLabels } from "../i18n/runtime";
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

export const ROOM_ACTIVITY_OPTIONS = localizeLabels(
  () =>
    [
      {
        key: "listening",
        title: uiText("Escuta coletiva"),
        description: uiText("Reproduza áudios e receba respostas em tempo real."),
        badge: uiText("Recomendado"),
        enabled: true,
      },
      {
        key: "flashcards",
        title: uiText("Flashcards em grupo"),
        description: uiText("Revise conceitos e acompanhe o domínio da turma."),
        badge: uiText("Em breve"),
        enabled: false,
      },
      {
        key: "quiz",
        title: uiText("Quiz competitivo"),
        description: uiText("Perguntas com tempo, pontuação e ranking."),
        badge: uiText("Em breve"),
        enabled: false,
      },
      {
        key: "bingo",
        title: uiText("Bingo"),
        description: uiText("Cartelas individuais e sorteio sincronizado."),
        enabled: true,
      },
    ] as const,
);

export const MANUAL_LISTENING_SOURCE = "Lista personalizada";
export const AUDIO_REPLAY_COOLDOWN_MS = 5_000;
export const TIME_STEPS = [5, 10, 15, 30] as const;

export function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}
