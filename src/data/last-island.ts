import { ACCOUNT_OWNER_KEY } from "./personal-data";
// A última ilha em que a pessoa entrou, para o Espaço do aluno continuar de onde ela parou.
// Fica só neste aparelho, por conta, como a ilha selecionada em practice-island-selection.
const KEY = "helena.lastIsland.v1";
export type LastIsland = { id: "english" | "mathematics"; part?: number; at: number };
export function rememberEnteredIsland(id: LastIsland["id"], part?: number) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        owner: localStorage.getItem(ACCOUNT_OWNER_KEY),
        id,
        at: Date.now(),
        ...(part === undefined ? {} : { part }),
      }),
    );
  } catch {
    /* Sem armazenamento, o Espaço usa a última prática registrada. */
  }
}
export function readLastIsland(): LastIsland | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (
      value?.owner !== localStorage.getItem(ACCOUNT_OWNER_KEY) ||
      (value.id !== "english" && value.id !== "mathematics") ||
      !Number.isFinite(value.at)
    )
      return undefined;
    const part =
      value.part >= 0 && value.part < 6 && Number.isInteger(value.part) ? value.part : undefined;
    return { id: value.id, at: value.at, ...(part === undefined ? {} : { part }) };
  } catch {
    return undefined;
  }
}

export type IslandChoice =
  { id: "english"; part: number } | { id: "mathematics"; course?: string | undefined };
type Activity = {
  islandId: string;
  completedAt: string;
  answers: number;
  englishAttempt?: { part: number } | undefined;
  englishA1Attempt?: { part: number } | undefined;
};
/**
 * Para onde o widget de ilha do Espaço do aluno leva: a ilha mais recente entre a última entrada
 * registrada e a última prática com respostas (Matemática ou Inglês). Empate fica com a entrada.
 */
export function lastIslandOf(
  activities: readonly Activity[],
  now: number,
  stored: LastIsland | undefined = readLastIsland(),
): IslandChoice {
  const done = activities
    .filter((item) => item.answers > 0 && Date.parse(item.completedAt) <= now)
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  const english = done.find((item) => item.islandId === "english");
  const math = done.find((item) => item.islandId.startsWith("mathematics:"));
  const time = (item?: Activity) => (item ? Date.parse(item.completedAt) : -1);
  const fresh = stored && stored.at <= now && stored.at >= Math.max(time(english), time(math));
  const id = fresh ? stored.id : time(english) > time(math) ? "english" : "mathematics";
  if (id === "mathematics") return { id, course: math?.islandId.slice(12) };
  const attempt = (english?.englishAttempt ?? english?.englishA1Attempt)?.part;
  const part =
    fresh && stored.id === "english" && stored.part !== undefined ? stored.part : attempt;
  return { id, part: part !== undefined && part >= 0 && part < 6 ? part : 0 };
}
