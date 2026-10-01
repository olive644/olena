import type { WorkspaceState } from "./workspace.js";

// Compara dois valores por conteúdo, não por referência nem por ordem de chaves (duas cópias
// do mesmo objeto, espalhadas em ordens diferentes, contam como iguais).
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}

function equal(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

type Identified = { id: string };

// Combina três versões de uma lista (a de referência comum e as duas que vieram de cada
// dispositivo) item por item, em vez de tratar a lista inteira como um bloco só. Um item
// que só mudou ou só foi adicionado/removido de um dos lados entra assim no resultado; só
// quando o MESMO item foi alterado de formas diferentes nos dois lados é que um precisa
// ceder lugar ao outro (e aí o lado local prevalece, como já acontecia antes desta mudança,
// só que agora restrito a esse item, não à lista inteira).
function mergeById<T extends Identified>(
  base: readonly T[],
  local: readonly T[],
  remote: readonly T[],
): { items: T[]; conflicts: number } {
  const baseMap = new Map(base.map((item) => [item.id, item] as const));
  const localMap = new Map(local.map((item) => [item.id, item] as const));
  const remoteMap = new Map(remote.map((item) => [item.id, item] as const));
  const order = [
    ...local.map((item) => item.id),
    ...remote.map((item) => item.id).filter((id) => !localMap.has(id)),
  ];
  const items: T[] = [];
  let conflicts = 0;
  for (const id of order) {
    const baseItem = baseMap.get(id);
    const localItem = localMap.get(id);
    const remoteItem = remoteMap.get(id);
    const localChanged = !equal(localItem, baseItem);
    const remoteChanged = !equal(remoteItem, baseItem);
    if (localChanged && remoteChanged && !equal(localItem, remoteItem)) {
      conflicts += 1;
      if (localItem) items.push(localItem);
      continue;
    }
    const winner = localChanged ? localItem : remoteItem;
    if (winner) items.push(winner);
  }
  return { items, conflicts };
}

function mergeValue<T>(base: T, local: T, remote: T): { value: T; conflict: boolean } {
  const localChanged = !equal(local, base);
  const remoteChanged = !equal(remote, base);
  if (localChanged && remoteChanged && !equal(local, remote))
    return { value: local, conflict: true };
  return { value: localChanged ? local : remote, conflict: false };
}

// Mescla o espaço de estudos inteiro por item (caderno, folha, tarefa, etc.), não como um
// bloco único. Antes desta função, dois dispositivos editando coisas diferentes (por
// exemplo, um caderno em cada) faziam um dos dois lados perder tudo que mudou: o merge por
// chave de armazenamento só via "o espaço de estudos mudou nos dois lados" e descartava um
// inteiro. Resolve exatamente isso: só quando o MESMO item foi alterado de formas
// diferentes nos dois dispositivos é que um precisa ceder lugar ao outro.
export function mergeWorkspaceStates(
  base: WorkspaceState,
  local: WorkspaceState,
  remote: WorkspaceState,
): { workspace: WorkspaceState; conflicts: number } {
  let conflicts = 0;
  function list<T extends Identified>(
    baseItems: readonly T[],
    localItems: readonly T[],
    remoteItems: readonly T[],
  ): T[] {
    const merged = mergeById(baseItems, localItems, remoteItems);
    conflicts += merged.conflicts;
    return merged.items;
  }
  function value<T>(baseValue: T, localValue: T, remoteValue: T): T {
    const merged = mergeValue(baseValue, localValue, remoteValue);
    if (merged.conflict) conflicts += 1;
    return merged.value;
  }
  const workspace: WorkspaceState = {
    version: local.version,
    subjects: list(base.subjects, local.subjects, remote.subjects),
    tasks: list(base.tasks, local.tasks, remote.tasks),
    events: list(base.events, local.events, remote.events),
    habits: list(base.habits, local.habits, remote.habits),
    notebooks: list(base.notebooks, local.notebooks, remote.notebooks),
    notes: list(base.notes, local.notes, remote.notes),
    focusSessions: list(base.focusSessions, local.focusSessions, remote.focusSessions),
    materials: list(base.materials, local.materials, remote.materials),
    flashcards: list(base.flashcards, local.flashcards, remote.flashcards),
    goals: list(base.goals, local.goals, remote.goals),
    quizAttempts: list(base.quizAttempts, local.quizAttempts, remote.quizAttempts),
    bingoBoards: list(base.bingoBoards, local.bingoBoards, remote.bingoBoards),
    homeworkLists: list(base.homeworkLists, local.homeworkLists, remote.homeworkLists),
    focusPreferences: value(base.focusPreferences, local.focusPreferences, remote.focusPreferences),
    studyPreferences: value(base.studyPreferences, local.studyPreferences, remote.studyPreferences),
  };
  return { workspace, conflicts };
}
