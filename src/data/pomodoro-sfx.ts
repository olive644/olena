import { areSoundEffectsEnabled } from "./accessibility-preferences";

/** Efeitos sonoros do Pomodoro: um arquivo por som, tocado do começo, só com os efeitos ligados. */
export function playPomodoroSound(name: "mordida" | "comecar" | "pausar" | "reiniciar") {
  if (areSoundEffectsEnabled()) new Audio(`/pomodoro-tomato/${name}.wav`).play().catch(() => 0);
}
