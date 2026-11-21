export type ShelfItemKind = "folder" | "typewriter" | "notebook";
export function shelfSkinRequirement(kind: ShelfItemKind, style: string): string {
  if (style === "english")
    return `Acerte ${kind === "folder" ? 1 : kind === "typewriter" ? 5 : 10} questões de Inglês.`;
  if (style === "mathematics")
    return kind === "folder"
      ? "Jogue uma rodada de Matemática."
      : kind === "typewriter"
        ? "Acerte 10 contas de Matemática."
        : "Conclua uma etapa de Matemática.";
  return "";
}
export function shelfSkinUnlocked(
  kind: ShelfItemKind,
  style: string,
  earned: ReadonlySet<string>,
): boolean {
  if (style === "english")
    return (
      earned.has(`english-correct-${kind === "folder" ? 1 : kind === "typewriter" ? 5 : 10}`) ||
      earned.has("english-correct-100")
    );
  if (style === "mathematics")
    return (
      earned.has(
        kind === "folder" ? "rounds-1" : kind === "typewriter" ? "correct-10" : "stages-1",
      ) || earned.has("correct-100")
    );
  return true;
}
