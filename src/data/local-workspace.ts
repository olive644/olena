import {
  WORKSPACE_VERSION,
  createInitialWorkspace,
  type Flashcard,
  type FocusSession,
  type FocusPreferences,
  type Habit,
  type QuizAttempt,
  type StudyGoal,
  type StudyMaterial,
  type StudyEvent,
  type StudyNotebook,
  type StudyNote,
  type StudyTask,
  type Subject,
  type WorkspaceState,
} from "../domain/workspace";
import {
  defaultStudyPreferences,
  studyModalities,
  type StudyPreferences,
} from "../domain/study-preferences";

export const WORKSPACE_STORAGE_KEY = "helenastudy.workspace.v1";
export const MAX_NOTE_ASSET_DATA_URL_LENGTH = 1_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isSubject(value: unknown): boolean {
  return (
    isRecord(value) && isString(value["id"]) && isString(value["name"]) && isString(value["color"])
  );
}

function isTask(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value["id"]) &&
    isString(value["title"]) &&
    isString(value["subjectId"]) &&
    isString(value["dueDate"]) &&
    typeof value["completed"] === "boolean"
  );
}

function isEvent(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value["id"]) &&
    isString(value["title"]) &&
    isString(value["subjectId"]) &&
    isString(value["date"]) &&
    isString(value["time"])
  );
}

function isHabit(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value["id"]) &&
    isString(value["title"]) &&
    Array.isArray(value["completedDates"]) &&
    value["completedDates"].every(isString)
  );
}

function isLegacyNote(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value["id"]) &&
    isString(value["title"]) &&
    isString(value["content"]) &&
    isString(value["subjectId"]) &&
    isString(value["updatedAt"])
  );
}

export function isHandwritingDocument(value: unknown): boolean {
  if (!isRecord(value) || value["version"] !== 1) return false;
  if (
    value["pageText"] !== undefined &&
    (typeof value["pageText"] !== "string" || value["pageText"].length > 5000)
  )
    return false;
  if (!["ruled", "grid", "dots", "blank", "night", "aged"].includes(String(value["paper"])))
    return false;
  if (
    value["paperColor"] !== undefined &&
    !["light", "aged", "night"].includes(String(value["paperColor"]))
  )
    return false;
  if (!Array.isArray(value["strokes"]) || value["strokes"].length > 500) return false;
  if (JSON.stringify(value).length > 800_000) return false;
  if (
    value["stickies"] !== undefined &&
    (!Array.isArray(value["stickies"]) ||
      value["stickies"].length > 40 ||
      !value["stickies"].every(
        (sticky: unknown) =>
          isRecord(sticky) &&
          (sticky["kind"] === undefined || sticky["kind"] === "text") &&
          (sticky["ink"] === undefined ||
            (typeof sticky["ink"] === "string" && /^#[0-9a-f]{6}$/i.test(sticky["ink"]))) &&
          isString(sticky["id"]) &&
          typeof sticky["x"] === "number" &&
          Number.isFinite(sticky["x"]) &&
          sticky["x"] >= 0 &&
          sticky["x"] <= 940 &&
          typeof sticky["y"] === "number" &&
          Number.isFinite(sticky["y"]) &&
          sticky["y"] >= 0 &&
          sticky["y"] <= 1380 &&
          ["yellow", "blue", "lilac"].includes(String(sticky["color"])) &&
          isString(sticky["text"]) &&
          sticky["text"].length <= 240,
      ))
  )
    return false;
  return value["strokes"].every(
    (stroke: unknown) =>
      isRecord(stroke) &&
      isString(stroke["id"]) &&
      (stroke["tool"] === "pen" || stroke["tool"] === "highlighter") &&
      isString(stroke["color"]) &&
      /^#[0-9a-f]{6}$/i.test(stroke["color"]) &&
      typeof stroke["width"] === "number" &&
      stroke["width"] > 0 &&
      stroke["width"] <= 100 &&
      Array.isArray(stroke["points"]) &&
      stroke["points"].length > 0 &&
      stroke["points"].length <= 5000 &&
      stroke["points"].every(
        (point: unknown) =>
          isRecord(point) &&
          typeof point["x"] === "number" &&
          Number.isFinite(point["x"]) &&
          point["x"] >= 0 &&
          point["x"] <= 1200 &&
          typeof point["y"] === "number" &&
          Number.isFinite(point["y"]) &&
          point["y"] >= 0 &&
          point["y"] <= 1600 &&
          typeof point["pressure"] === "number" &&
          Number.isFinite(point["pressure"]) &&
          point["pressure"] >= 0 &&
          point["pressure"] <= 1,
      ),
  );
}

function isNoteAsset(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value["id"]) &&
    (value["kind"] === "scan" || value["kind"] === "drawing") &&
    isString(value["name"]) &&
    isString(value["dataUrl"]) &&
    /^data:image\/(?:jpeg|png|webp);base64,/.test(value["dataUrl"]) &&
    value["dataUrl"].length <= MAX_NOTE_ASSET_DATA_URL_LENGTH &&
    isString(value["createdAt"]) &&
    (!("handwriting" in value) ||
      (value["kind"] === "drawing" && isHandwritingDocument(value["handwriting"])))
  );
}

function isNote(value: unknown): boolean {
  return (
    isLegacyNote(value) &&
    isRecord(value) &&
    Array.isArray(value["assets"]) &&
    value["assets"].every(isNoteAsset)
  );
}

function isNotebook(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value["kind"] === undefined || value["kind"] === "folder") &&
    (value["parentId"] === undefined || isString(value["parentId"])) &&
    isString(value["id"]) &&
    isString(value["title"]) &&
    isString(value["subjectId"]) &&
    isString(value["createdAt"]) &&
    Array.isArray(value["pageIds"]) &&
    value["pageIds"].every(isString)
  );
}

function isFocusSession(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value["id"]) &&
    isString(value["subjectId"]) &&
    typeof value["durationMinutes"] === "number" &&
    Number.isFinite(value["durationMinutes"]) &&
    value["durationMinutes"] > 0 &&
    isString(value["completedAt"])
  );
}

function isMaterial(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value["id"]) &&
    isString(value["subjectId"]) &&
    isString(value["title"]) &&
    (value["kind"] === "link" || value["kind"] === "text") &&
    isString(value["content"]) &&
    isString(value["createdAt"])
  );
}

function isFlashcard(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value["id"]) &&
    isString(value["subjectId"]) &&
    isString(value["front"]) &&
    isString(value["back"]) &&
    typeof value["intervalDays"] === "number" &&
    Number.isInteger(value["intervalDays"]) &&
    value["intervalDays"] >= 0 &&
    isString(value["nextReview"])
  );
}

function isGoal(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value["id"]) &&
    isString(value["subjectId"]) &&
    isString(value["title"]) &&
    typeof value["targetMinutes"] === "number" &&
    Number.isFinite(value["targetMinutes"]) &&
    value["targetMinutes"] > 0 &&
    isString(value["deadline"]) &&
    typeof value["completed"] === "boolean"
  );
}

function isQuizAttempt(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value["id"]) &&
    isString(value["subjectId"]) &&
    typeof value["correct"] === "number" &&
    Number.isInteger(value["correct"]) &&
    typeof value["total"] === "number" &&
    Number.isInteger(value["total"]) &&
    value["correct"] >= 0 &&
    value["total"] > 0 &&
    value["correct"] <= value["total"] &&
    isString(value["completedAt"])
  );
}

function isBingoBoard(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value["id"]) &&
    isString(value["subjectId"]) &&
    isString(value["createdAt"]) &&
    Array.isArray(value["cells"]) &&
    value["cells"].length === 9 &&
    value["cells"].every(
      (cell) =>
        isRecord(cell) &&
        isString(cell["id"]) &&
        isString(cell["label"]) &&
        typeof cell["completed"] === "boolean",
    )
  );
}

function isHomeworkList(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value["id"]) &&
    isString(value["subjectId"]) &&
    isString(value["title"]) &&
    isString(value["createdAt"]) &&
    Array.isArray(value["items"]) &&
    value["items"].every(
      (item) =>
        isRecord(item) &&
        isString(item["id"]) &&
        isString(item["title"]) &&
        typeof item["completed"] === "boolean",
    )
  );
}

type LegacyStudyNote = Omit<StudyNote, "assets">;

type LegacyWorkspace = {
  version: 1;
  subjects: Subject[];
  tasks: StudyTask[];
  events: StudyEvent[];
  habits: Habit[];
  notes: LegacyStudyNote[];
  focusSessions: FocusSession[];
};

type WorkspaceV2 = Omit<LegacyWorkspace, "version"> & {
  version: 2;
  materials: StudyMaterial[];
  flashcards: Flashcard[];
  goals: StudyGoal[];
  quizAttempts: QuizAttempt[];
};

type WorkspaceV3 = Omit<
  WorkspaceState,
  "version" | "notebooks" | "notes" | "homeworkLists" | "focusPreferences" | "studyPreferences"
> & {
  version: 3;
  notes: StudyNote[];
};

type WorkspaceV4 = Omit<
  WorkspaceState,
  "version" | "notebooks" | "focusPreferences" | "studyPreferences"
> & {
  version: 4;
};
type WorkspaceV5 = Omit<WorkspaceState, "version" | "notebooks" | "studyPreferences"> & {
  version: 5;
};
type WorkspaceV6 = Omit<WorkspaceState, "version" | "notebooks"> & { version: 6 };

function isFocusPreferences(value: unknown): value is FocusPreferences {
  return (
    isRecord(value) &&
    (value["pomodoroMinutes"] === 25 || value["pomodoroMinutes"] === 50) &&
    typeof value["longBreaks"] === "boolean"
  );
}

function isStudyPreferences(value: unknown): value is StudyPreferences {
  return (
    isRecord(value) &&
    Array.isArray(value["modalities"]) &&
    value["modalities"].every(
      (modality) =>
        typeof modality === "string" &&
        studyModalities.includes(modality as StudyPreferences["modalities"][number]),
    ) &&
    (value["processing"] === "sequencial" || value["processing"] === "global") &&
    (value["rhythm"] === "focado" || value["rhythm"] === "difuso") &&
    ["nenhum", "python", "javascript", "python-javascript"].includes(String(value["programming"]))
  );
}

function hasCoreCollections(
  value: Record<string, unknown>,
  noteValidator: (note: unknown) => boolean,
): boolean {
  return (
    Array.isArray(value["subjects"]) &&
    value["subjects"].length > 0 &&
    value["subjects"].every(isSubject) &&
    Array.isArray(value["tasks"]) &&
    value["tasks"].every(isTask) &&
    Array.isArray(value["events"]) &&
    value["events"].every(isEvent) &&
    Array.isArray(value["habits"]) &&
    value["habits"].every(isHabit) &&
    Array.isArray(value["notes"]) &&
    value["notes"].every(noteValidator) &&
    Array.isArray(value["focusSessions"]) &&
    value["focusSessions"].every(isFocusSession)
  );
}

function isLegacyWorkspace(value: unknown): value is LegacyWorkspace {
  return isRecord(value) && value["version"] === 1 && hasCoreCollections(value, isLegacyNote);
}

function isWorkspaceV2(value: unknown): value is WorkspaceV2 {
  if (!isRecord(value) || value["version"] !== 2) return false;
  return (
    hasCoreCollections(value, isLegacyNote) &&
    Array.isArray(value["materials"]) &&
    value["materials"].every(isMaterial) &&
    Array.isArray(value["flashcards"]) &&
    value["flashcards"].every(isFlashcard) &&
    Array.isArray(value["goals"]) &&
    value["goals"].every(isGoal) &&
    Array.isArray(value["quizAttempts"]) &&
    value["quizAttempts"].every(isQuizAttempt)
  );
}

function isWorkspaceV3(value: unknown): value is WorkspaceV3 {
  if (!isRecord(value) || value["version"] !== 3) return false;
  return (
    hasCoreCollections(value, isNote) &&
    Array.isArray(value["materials"]) &&
    value["materials"].every(isMaterial) &&
    Array.isArray(value["flashcards"]) &&
    value["flashcards"].every(isFlashcard) &&
    Array.isArray(value["goals"]) &&
    value["goals"].every(isGoal) &&
    Array.isArray(value["quizAttempts"]) &&
    value["quizAttempts"].every(isQuizAttempt) &&
    Array.isArray(value["bingoBoards"]) &&
    value["bingoBoards"].every(isBingoBoard)
  );
}

export function isWorkspaceState(value: unknown): value is WorkspaceState {
  if (!isRecord(value) || value["version"] !== WORKSPACE_VERSION) return false;

  return (
    hasCoreCollections(value, isNote) &&
    Array.isArray(value["materials"]) &&
    value["materials"].every(isMaterial) &&
    Array.isArray(value["flashcards"]) &&
    value["flashcards"].every(isFlashcard) &&
    Array.isArray(value["goals"]) &&
    value["goals"].every(isGoal) &&
    Array.isArray(value["quizAttempts"]) &&
    value["quizAttempts"].every(isQuizAttempt) &&
    Array.isArray(value["bingoBoards"]) &&
    value["bingoBoards"].every(isBingoBoard) &&
    Array.isArray(value["homeworkLists"]) &&
    value["homeworkLists"].every(isHomeworkList) &&
    Array.isArray(value["notebooks"]) &&
    value["notebooks"].every(isNotebook) &&
    isFocusPreferences(value["focusPreferences"]) &&
    isStudyPreferences(value["studyPreferences"])
  );
}

function isWorkspaceV5(value: unknown): value is WorkspaceV5 {
  if (!isRecord(value) || value["version"] !== 5) return false;
  return (
    hasCoreCollections(value, isNote) &&
    Array.isArray(value["materials"]) &&
    value["materials"].every(isMaterial) &&
    Array.isArray(value["flashcards"]) &&
    value["flashcards"].every(isFlashcard) &&
    Array.isArray(value["goals"]) &&
    value["goals"].every(isGoal) &&
    Array.isArray(value["quizAttempts"]) &&
    value["quizAttempts"].every(isQuizAttempt) &&
    Array.isArray(value["bingoBoards"]) &&
    value["bingoBoards"].every(isBingoBoard) &&
    Array.isArray(value["homeworkLists"]) &&
    value["homeworkLists"].every(isHomeworkList) &&
    isFocusPreferences(value["focusPreferences"])
  );
}

function isWorkspaceV6(value: unknown): value is WorkspaceV6 {
  if (!isRecord(value) || value["version"] !== 6) return false;
  return (
    hasCoreCollections(value, isNote) &&
    Array.isArray(value["materials"]) &&
    value["materials"].every(isMaterial) &&
    Array.isArray(value["flashcards"]) &&
    value["flashcards"].every(isFlashcard) &&
    Array.isArray(value["goals"]) &&
    value["goals"].every(isGoal) &&
    Array.isArray(value["quizAttempts"]) &&
    value["quizAttempts"].every(isQuizAttempt) &&
    Array.isArray(value["bingoBoards"]) &&
    value["bingoBoards"].every(isBingoBoard) &&
    Array.isArray(value["homeworkLists"]) &&
    value["homeworkLists"].every(isHomeworkList) &&
    isFocusPreferences(value["focusPreferences"]) &&
    isStudyPreferences(value["studyPreferences"])
  );
}

function isWorkspaceV4(value: unknown): value is WorkspaceV4 {
  if (!isRecord(value) || value["version"] !== 4) return false;
  return (
    hasCoreCollections(value, isNote) &&
    Array.isArray(value["materials"]) &&
    value["materials"].every(isMaterial) &&
    Array.isArray(value["flashcards"]) &&
    value["flashcards"].every(isFlashcard) &&
    Array.isArray(value["goals"]) &&
    value["goals"].every(isGoal) &&
    Array.isArray(value["quizAttempts"]) &&
    value["quizAttempts"].every(isQuizAttempt) &&
    Array.isArray(value["bingoBoards"]) &&
    value["bingoBoards"].every(isBingoBoard) &&
    Array.isArray(value["homeworkLists"]) &&
    value["homeworkLists"].every(isHomeworkList)
  );
}

function migrateNotes(notes: LegacyStudyNote[]): StudyNote[] {
  return notes.map((note) => ({ ...note, assets: [] }));
}

function notebooksFromNotes(notes: StudyNote[]): StudyNotebook[] {
  return notes.map((note) => ({
    id: `notebook-${note.id}`,
    title: note.title || "Caderno importado",
    subjectId: note.subjectId,
    createdAt: note.updatedAt,
    pageIds: [note.id],
  }));
}

function migrateLegacyWorkspace(legacy: LegacyWorkspace): WorkspaceState {
  const notes = migrateNotes(legacy.notes);
  return {
    ...legacy,
    version: WORKSPACE_VERSION,
    notes,
    notebooks: notebooksFromNotes(notes),
    materials: [],
    flashcards: [],
    goals: [],
    quizAttempts: [],
    bingoBoards: [],
    homeworkLists: [],
    focusPreferences: { pomodoroMinutes: 25, longBreaks: true },
    studyPreferences: defaultStudyPreferences,
  };
}

function migrateWorkspaceV2(workspace: WorkspaceV2): WorkspaceState {
  const notes = migrateNotes(workspace.notes);
  return {
    ...workspace,
    version: WORKSPACE_VERSION,
    notes,
    notebooks: notebooksFromNotes(notes),
    bingoBoards: [],
    homeworkLists: [],
    focusPreferences: { pomodoroMinutes: 25, longBreaks: true },
    studyPreferences: defaultStudyPreferences,
  };
}

function migrateWorkspaceV3(workspace: WorkspaceV3): WorkspaceState {
  return {
    ...workspace,
    version: WORKSPACE_VERSION,
    notebooks: notebooksFromNotes(workspace.notes),
    homeworkLists: [],
    focusPreferences: { pomodoroMinutes: 25, longBreaks: true },
    studyPreferences: defaultStudyPreferences,
  };
}

function migrateWorkspaceV4(workspace: WorkspaceV4): WorkspaceState {
  return {
    ...workspace,
    version: WORKSPACE_VERSION,
    notebooks: notebooksFromNotes(workspace.notes),
    focusPreferences: { pomodoroMinutes: 25, longBreaks: true },
    studyPreferences: defaultStudyPreferences,
  };
}

function migrateWorkspaceV5(workspace: WorkspaceV5): WorkspaceState {
  return {
    ...workspace,
    version: WORKSPACE_VERSION,
    notebooks: notebooksFromNotes(workspace.notes),
    studyPreferences: defaultStudyPreferences,
  };
}

function migrateWorkspaceV6(workspace: WorkspaceV6): WorkspaceState {
  return {
    ...workspace,
    version: WORKSPACE_VERSION,
    notebooks: notebooksFromNotes(workspace.notes),
  };
}

export function loadWorkspace(storage: Pick<Storage, "getItem">): WorkspaceState {
  const serialized = storage.getItem(WORKSPACE_STORAGE_KEY);
  if (!serialized) return createInitialWorkspace();

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (isWorkspaceState(parsed)) return parsed;
    if (isWorkspaceV6(parsed)) return migrateWorkspaceV6(parsed);
    if (isWorkspaceV5(parsed)) return migrateWorkspaceV5(parsed);
    if (isWorkspaceV4(parsed)) return migrateWorkspaceV4(parsed);
    if (isWorkspaceV3(parsed)) return migrateWorkspaceV3(parsed);
    if (isWorkspaceV2(parsed)) return migrateWorkspaceV2(parsed);
    if (isLegacyWorkspace(parsed)) return migrateLegacyWorkspace(parsed);
    return createInitialWorkspace();
  } catch {
    return createInitialWorkspace();
  }
}

export function saveWorkspace(storage: Pick<Storage, "setItem">, workspace: WorkspaceState): void {
  storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}
