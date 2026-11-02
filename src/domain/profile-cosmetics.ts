export const PRIDE_THEMES = [
  { id: "pride", name: "Orgulho LGBT" },
  { id: "lesbian", name: "Lésbica" },
  { id: "gay", name: "Gay" },
  { id: "bi", name: "Bissexual" },
  { id: "trans", name: "Trans" },
  { id: "pan", name: "Pansexual" },
  { id: "nonbinary", name: "Não binárie" },
  { id: "ace", name: "Assexual" },
  { id: "aro", name: "Arromântica" },
  { id: "agender", name: "Agênero" },
  { id: "genderfluid", name: "Gênero fluido" },
  { id: "intersex", name: "Intersexo" },
] as const;
export const PROFILE_FRAMES = [
  { id: "none", name: "Sem moldura" },
  ...PRIDE_THEMES,
  { id: "mathematics", name: "Guardião dos números" },
] as const;
export const PROFILE_BACKGROUNDS = [
  { id: "paper", name: "Papel original" },
  ...PRIDE_THEMES,
  { id: "mathematics", name: "Guardião dos números" },
  { id: "night", name: "Céu de papel" },
  { id: "geometry", name: "Caderno geométrico" },
] as const;
export type ProfileFrame = (typeof PROFILE_FRAMES)[number]["id"];
export type ProfileBackground = (typeof PROFILE_BACKGROUNDS)[number]["id"];
export function profileFrame(value: unknown): ProfileFrame {
  return PROFILE_FRAMES.find((item) => item.id === value)?.id ?? "none";
}
export function profileBackground(value: unknown): ProfileBackground {
  return PROFILE_BACKGROUNDS.find((item) => item.id === value)?.id ?? "paper";
}
export function cosmeticUnlocked(
  kind: "frame" | "cover" | "background",
  id: string,
  earned: ReadonlySet<string>,
) {
  return id !== "mathematics" || earned.has(kind === "frame" ? "islands-1" : "correct-100");
}
