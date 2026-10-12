export function durationFromDial(
  current: number,
  hand: "hours" | "minutes",
  mark: number,
  max: number,
): number {
  const cycle = hand === "hours" ? 12 : 60;
  const scale = hand === "hours" ? 60 : 1;
  let delta = mark - (Math.floor(current / scale) % cycle);
  if (delta > cycle / 2) delta -= cycle;
  if (delta < -cycle / 2) delta += cycle;
  return Math.max(1, Math.min(max, current + delta * scale));
}
