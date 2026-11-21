import { shelfSkinUnlocked } from "./shelf-skins";

export type NotebookCoverStyle =
  | "helena-estrelas"
  | "oliver-estrelas"
  | "mathematics"
  | "english"
  | "pride"
  | "blood-moon"
  | "solar-eclipse"
  | "lunar-eclipse";
export const NOTEBOOK_COVERS = [
  { id: "helena-estrelas", name: "Céu de papel", requirement: "" },
  { id: "pride", name: "Todas as cores", requirement: "" },
  {
    id: "mathematics",
    name: "Guardião dos números",
    requirement: "Conclua uma etapa de Matemática.",
  },
  { id: "english", name: "Guardião das palavras", requirement: "Acerte 10 questões de Inglês." },
  { id: "blood-moon", name: "Lua Sangrenta", requirement: "" },
  { id: "solar-eclipse", name: "Eclipse Solar", requirement: "" },
  { id: "lunar-eclipse", name: "Eclipse Lunar", requirement: "" },
] as const;
export function notebookCoverTheme(style: NotebookCoverStyle | undefined) {
  return style &&
    ["mathematics", "english", "pride", "blood-moon", "solar-eclipse", "lunar-eclipse"].includes(
      style,
    )
    ? style
    : "stars";
}
export function notebookCoverUnlocked(style: NotebookCoverStyle, earned: ReadonlySet<string>) {
  return shelfSkinUnlocked("notebook", style, earned);
}
