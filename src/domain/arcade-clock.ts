export const ARCADE_LIVES = 3;
export const ARCADE_RESERVE = 60;
export const ARCADE_COUNTDOWN = 3;
export function arcadeElapsed(start: { elapsed: number; at: number; wallAt: number }) {
  return (
    start.elapsed + Math.max(0, performance.now() - start.at, Date.now() - start.wallAt) / 1000
  );
}
export function arcadeQuestionTiming(readingLength: number, difficulty: number, calculus = false) {
  return {
    budget: 28 + Math.ceil(readingLength / 12) + (calculus ? 10 : 0) + (difficulty - 1) * 4,
    drain: 1,
  };
}
export function arcadeReserve(
  bank: number,
  correct: boolean,
  timedOut: boolean,
  fast: boolean,
  final = false,
) {
  return bank <= 0 || final
    ? Math.max(ARCADE_RESERVE, bank)
    : timedOut
      ? Math.max(0, bank - 4) || ARCADE_RESERVE
      : correct
        ? Math.min(90, bank + (fast ? 3 : 2))
        : bank;
}
