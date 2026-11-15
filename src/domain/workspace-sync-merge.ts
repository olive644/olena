import { MAX_REMOVAL_MARKS, type PracticeActivity, type WorkspaceState } from "./workspace.js";
import { normalizeNotebookFavorites } from "./notebook-shelves.js";
import { validateCalendarEvent } from "./agenda-calendar";

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
  fields = false,
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
      if (fields && baseItem && localItem && remoteItem) {
        const baseRecord = baseItem as T & Record<string, unknown>,
          localRecord = localItem as T & Record<string, unknown>,
          remoteRecord = remoteItem as T & Record<string, unknown>;
        const merged: Record<string, unknown> = {};
        let conflict = false;
        for (const key of new Set([
          ...Object.keys(baseRecord),
          ...Object.keys(localRecord),
          ...Object.keys(remoteRecord),
        ])) {
          if (["completedDates", "excludedDates"].includes(key)) {
            const baseDates = (baseRecord[key] ?? []) as string[],
              localDates = (localRecord[key] ?? []) as string[],
              remoteDates = (remoteRecord[key] ?? []) as string[];
            merged[key] = [...new Set([...baseDates, ...localDates, ...remoteDates])]
              .filter(
                (date) =>
                  mergeValue(
                    baseDates.includes(date),
                    localDates.includes(date),
                    remoteDates.includes(date),
                  ).value,
              )
              .sort();
          } else {
            const value = mergeValue(baseRecord[key], localRecord[key], remoteRecord[key]);
            if (value.value !== undefined) merged[key] = value.value;
            conflict ||= value.conflict;
          }
        }
        if (
          "time" in merged &&
          validateCalendarEvent(merged as unknown as WorkspaceState["events"][number])
        ) {
          items.push(localItem);
          conflicts++;
        } else {
          items.push(merged as T);
          if (conflict) conflicts++;
        }
        continue;
      }
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

// Atividades de prática concluídas (de onde vem todo o progresso de Inglês) só são acrescentadas,
// nunca removidas: uma cópia mais antiga ou vazia de outro aparelho não pode apagar o que já foi
// concluído. Para o mesmo id, vale a cópia de `preferred`.
function unionPracticeActivities(
  preferred: readonly PracticeActivity[] | undefined,
  other: readonly PracticeActivity[] | undefined,
): PracticeActivity[] | undefined {
  if (!preferred && !other) return undefined;
  const ids = new Set((preferred ?? []).map((item) => item.id));
  return [...(preferred ?? []), ...(other ?? []).filter((item) => !ids.has(item.id))];
}

// Marcas de exclusão: o que a pessoa apagou aqui não volta por uma cópia mais antiga (a da conta
// ou a do IndexedDB, gravada com atraso). As marcas de todas as cópias valem juntas.
function unionRemovals(...lists: (readonly string[] | undefined)[]): string[] {
  return [...new Set(lists.flatMap((list) => list ?? []))].slice(-MAX_REMOVAL_MARKS);
}

// Tira do espaço os cadernos marcados como apagados, com as folhas deles, e solta os que eram
// subpastas de um caderno apagado.
function withoutRemovedNotebooks(workspace: WorkspaceState, removed: readonly string[]) {
  if (removed.length === 0) return workspace;
  const marks = new Set(removed);
  const gone = workspace.notebooks.filter((notebook) => marks.has(notebook.id));
  if (gone.length === 0) return workspace;
  const pageIds = new Set(gone.flatMap((notebook) => notebook.pageIds));
  return {
    ...workspace,
    notebooks: workspace.notebooks
      .filter((notebook) => !marks.has(notebook.id))
      .map((notebook) => {
        if (!notebook.parentId || !marks.has(notebook.parentId)) return notebook;
        const { parentId, ...rest } = notebook;
        void parentId;
        return rest;
      }),
    notes: workspace.notes.filter((note) => !pageIds.has(note.id)),
  };
}

// Espaço que vem da conta ao abrir o app: vale a cópia da conta, mas o histórico concluído neste
// aparelho (sessões de foco e atividades de prática) nunca some por ainda não ter sido enviado.
export function mergeAccountWorkspace(
  local: WorkspaceState,
  account: WorkspaceState,
): WorkspaceState {
  const sessions = new Map(account.focusSessions.map((session) => [session.id, session] as const));
  for (const session of local.focusSessions)
    if (!sessions.has(session.id)) sessions.set(session.id, session);
  const practiceActivities = unionPracticeActivities(
    account.practiceActivities,
    local.practiceActivities,
  );
  const removed = unionRemovals(account.removedNotebookIds, local.removedNotebookIds);
  // Se esta cópia apagou a prateleira, uma cópia antiga da conta não devolve o nome.
  const shelfCleared = Boolean(local.notebookShelfCleared || account.notebookShelfCleared);
  const merged = withoutRemovedNotebooks(
    {
      ...account,
      focusSessions: [...sessions.values()],
      ...(practiceActivities ? { practiceActivities } : {}),
    },
    removed,
  );
  const { notebookShelfCleared, removedNotebookIds, ...rest } = merged;
  void notebookShelfCleared;
  void removedNotebookIds;
  return {
    ...rest,
    ...(removed.length ? { removedNotebookIds: removed } : {}),
    ...(shelfCleared ? { notebookShelfCleared: true, notebookShelfName: "" } : {}),
  };
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
    ...(base.notebookShelfName !== undefined ||
    local.notebookShelfName !== undefined ||
    remote.notebookShelfName !== undefined
      ? {
          notebookShelfName: value(
            base.notebookShelfName ?? "",
            local.notebookShelfName ?? base.notebookShelfName ?? "",
            remote.notebookShelfName ?? base.notebookShelfName ?? "",
          ),
        }
      : {}),
    version: local.version,
    subjects: list(base.subjects, local.subjects, remote.subjects),
    tasks: (() => {
      const result = mergeById(base.tasks, local.tasks, remote.tasks, true);
      conflicts += result.conflicts;
      return result.items;
    })(),
    events: (() => {
      const result = mergeById(base.events, local.events, remote.events, true);
      conflicts += result.conflicts;
      return result.items;
    })(),
    habits: list(base.habits, local.habits, remote.habits),
    notebooks: normalizeNotebookFavorites(list(base.notebooks, local.notebooks, remote.notebooks)),
    notes: list(base.notes, local.notes, remote.notes),
    // Completed focus entries are immutable history, never a shorter-device snapshot deletion.
    focusSessions: list([], local.focusSessions, remote.focusSessions),
    ...((): Pick<WorkspaceState, "practiceActivities"> => {
      const practiceActivities = unionPracticeActivities(
        local.practiceActivities,
        unionPracticeActivities(remote.practiceActivities, base.practiceActivities),
      );
      return practiceActivities ? { practiceActivities } : {};
    })(),
    materials: list(base.materials, local.materials, remote.materials),
    ...(base.libraryCollections || local.libraryCollections || remote.libraryCollections
      ? {
          libraryCollections: list(
            base.libraryCollections ?? [],
            local.libraryCollections ?? base.libraryCollections ?? [],
            remote.libraryCollections ?? base.libraryCollections ?? [],
          ),
        }
      : {}),
    flashcards: list(base.flashcards, local.flashcards, remote.flashcards),
    goals: list(base.goals, local.goals, remote.goals),
    quizAttempts: list(base.quizAttempts, local.quizAttempts, remote.quizAttempts),
    bingoBoards: list(base.bingoBoards, local.bingoBoards, remote.bingoBoards),
    homeworkLists: list(base.homeworkLists, local.homeworkLists, remote.homeworkLists),
    focusPreferences: value(base.focusPreferences, local.focusPreferences, remote.focusPreferences),
    studyPreferences: value(base.studyPreferences, local.studyPreferences, remote.studyPreferences),
  };
  // Marcas de exclusão de todas as cópias valem juntas: um caderno apagado em qualquer aparelho
  // não volta porque o outro ainda o tinha.
  const removed = unionRemovals(
    base.removedNotebookIds,
    local.removedNotebookIds,
    remote.removedNotebookIds,
  );
  // A marca de prateleira apagada se mescla como qualquer valor: dar um nome novo (que a limpa)
  // vence a marca antiga que ainda esteja na outra cópia.
  const cleared = value(
    Boolean(base.notebookShelfCleared),
    Boolean(local.notebookShelfCleared),
    Boolean(remote.notebookShelfCleared),
  );
  const cleaned = withoutRemovedNotebooks(workspace, removed);
  const { notebookShelfCleared, removedNotebookIds, ...rest } = cleaned;
  void notebookShelfCleared;
  void removedNotebookIds;
  return {
    workspace: {
      ...rest,
      ...(removed.length ? { removedNotebookIds: removed } : {}),
      ...(cleared ? { notebookShelfCleared: true, notebookShelfName: "" } : {}),
    },
    conflicts,
  };
}
