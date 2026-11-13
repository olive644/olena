import { cosmeticUnlocked } from "./profile-cosmetics";

export type NotebookCoverStyle =
  "helena-estrelas" | "oliver-estrelas" | "mathematics" | "english" | "pride";
export const NOTEBOOK_COVERS = [
  { id: "helena-estrelas", name: "Céu de papel", requirement: "" },
  { id: "pride", name: "Todas as cores", requirement: "" },
  {
    id: "mathematics",
    name: "Guardião dos números",
    requirement: "Acerte 100 questões de Matemática.",
  },
  { id: "english", name: "Guardião das palavras", requirement: "Acerte 100 questões de Inglês." },
] as const;
export function notebookCoverTheme(style: NotebookCoverStyle | undefined) {
  return style === "mathematics" || style === "english" || style === "pride" ? style : "stars";
}
export function notebookCoverUnlocked(style: NotebookCoverStyle, earned: ReadonlySet<string>) {
  return cosmeticUnlocked("cover", style, earned);
}
