import type { NotebookCoverStyle } from "../domain/notebook-covers";
import { notebookCoverTheme } from "../domain/notebook-covers";
export const NOTEBOOK_COVER_ART = "/notebook-covers/capa-estrelas.webp";
export function notebookCoverArt(style: NotebookCoverStyle | undefined, back = false) {
  const theme = notebookCoverTheme(style);
  if (theme === "stars" && !back) return NOTEBOOK_COVER_ART;
  return `/notebook-covers/${back ? "verso" : "capa"}-${theme}.webp`;
}
