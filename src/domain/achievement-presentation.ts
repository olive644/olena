import type { Achievement } from "./math-achievements";
import type { AchievementTheme, AchievementTier } from "./general-achievements";
export const ACHIEVEMENT_MATERIALS: Record<
  AchievementTier,
  { label: string; face: string; depth: string; fold: string }
> = {
  bronze: { label: "Bronze", face: "#c18a53", depth: "#754724", fold: "#f4c995" },
  silver: { label: "Prata", face: "#a7b5c9", depth: "#596c83", fold: "#eff6ff" },
  gold: { label: "Ouro", face: "#facc15", depth: "#a76b08", fold: "#fff0b5" },
  emerald: { label: "Esmeralda", face: "#32bc92", depth: "#126b56", fold: "#adf4d9" },
};
export const ACHIEVEMENT_THEMES: Record<
  AchievementTheme,
  { label: string; face: string; depth: string; accent: string; paper: string }
> = {
  mathematics: {
    label: "Matemática",
    face: "#1264e8",
    depth: "#103e9a",
    accent: "#facc15",
    paper: "#fff9ef",
  },
  focus: { label: "Foco", face: "#ef4f3c", depth: "#a62f27", accent: "#6cbd65", paper: "#fff3e9" },
  notebooks: {
    label: "Cadernos",
    face: "#7433e0",
    depth: "#51259b",
    accent: "#facc15",
    paper: "#fff9ef",
  },
  friends: {
    label: "Amigos",
    face: "#138a91",
    depth: "#0d626b",
    accent: "#facc15",
    paper: "#effafb",
  },
  routine: {
    label: "Rotina",
    face: "#b67415",
    depth: "#765014",
    accent: "#7433e0",
    paper: "#fff9ef",
  },
};
export function achievementTheme(item: Achievement): AchievementTheme {
  return item.category === "general" ? item.theme : "mathematics";
}
export function achievementFamily(item: Achievement) {
  return item.category === "general"
    ? item.family
    : `${item.course ?? "mathematics"}-${item.metric}`;
}
export function placeAchievementFavorite(
  favorites: readonly string[],
  id: string,
  slot: number,
  earned: ReadonlySet<string>,
): string[] {
  if (!earned.has(id)) return [...favorites];
  const next = favorites.filter((value) => value !== id);
  const index = Math.max(0, Math.min(2, slot, next.length));
  if (next.length === 3) next.splice(index, 1);
  next.splice(index, 0, id);
  return next.slice(0, 3);
}
export function achievementFamilies(catalog: readonly Achievement[], earned: ReadonlySet<string>) {
  const groups = new Map<string, Achievement[]>();
  for (const item of catalog) {
    const key = achievementFamily(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((items) => items.filter((item) => earned.has(item.id)).at(-1) ?? items[0]!)
    .sort((a, b) => Number(earned.has(b.id)) - Number(earned.has(a.id)));
}
