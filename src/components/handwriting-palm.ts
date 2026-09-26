// Rejeição de palma: com a caneta em uso, a mão apoiada na tela não pode virar gesto.
// Sem isso, dois pontos de contato da palma disparavam o zoom por pinça e apagavam o traço que
// a caneta estava fazendo.

// Depois que a caneta sai da tela, a palma ainda costuma tocar por um instante.
export const PALM_GRACE_MS = 500;

export type PalmState = {
  // Existe um ponteiro de caneta apoiado na folha agora.
  penDown: boolean;
  // Instante (performance.now) do último evento de caneta, ou null se nunca houve.
  lastPenAt: number | null;
};

export function shouldIgnoreTouch(state: PalmState, now: number): boolean {
  if (state.penDown) return true;
  return state.lastPenAt !== null && now - state.lastPenAt < PALM_GRACE_MS;
}
