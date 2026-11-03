// Sequência pedagógica por situação. IDs e conteúdo histórico permanecem estáveis.
export const ENGLISH_SCENE_LEVELS = [
  [0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 0, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 5],
  [0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 1, 1, 4, 4, 4, 4, 2, 2, 5, 2],
  [0, 1, 2, 2, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 1, 1, 2, 2, 4, 4, 5, 3, 3, 3, 3, 5],
  [1, 0, 2, 0, 1, 0, 0, 0, 0, 1, 1, 1, 2, 3, 3, 3, 2, 2, 1, 2, 3, 3, 4, 4, 4, 4, 4, 3, 3, 5],
  [4, 4, 5, 4, 5, 5, 0, 0, 0, 1, 1, 1, 2, 1, 2, 2, 2, 3, 0, 1, 2, 2, 3, 3, 4, 3, 3, 4, 2, 0],
  [5, 5, 5, 5, 5, 5, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1, 2, 0, 2, 0, 2, 2, 3, 3, 3, 4, 3, 3, 4, 4],
] as const;
export function englishDifficulty(part: number, id: number) {
  return ENGLISH_SCENE_LEVELS[part]?.[Math.floor(id / 4)] ?? 0;
}
