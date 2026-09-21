import { defaultStudyPreferences, type StudyPreferences } from "./study-preferences";
import type { HandwritingDocument } from "./handwriting";

export const WORKSPACE_VERSION = 7 as const;

export type FocusPreferences = {
  pomodoroMinutes: 25 | 50;
  longBreaks: boolean;
};

export type Subject = {
  id: string;
  name: string;
  color: string;
};

export type StudyTask = {
  id: string;
  title: string;
  subjectId: string;
  dueDate: string;
  completed: boolean;
};

export type StudyEvent = {
  id: string;
  title: string;
  subjectId: string;
  date: string;
  time: string;
};

export type Habit = {
  id: string;
  title: string;
  completedDates: string[];
};

export type StudyNote = {
  id: string;
  title: string;
  content: string;
  subjectId: string;
  updatedAt: string;
  assets: NoteAsset[];
};

export type StudyNotebook = {
  id: string;
  title: string;
  subjectId: string;
  createdAt: string;
  pageIds: string[];
};

export type NoteAsset = {
  id: string;
  kind: "scan" | "drawing";
  name: string;
  dataUrl: string;
  createdAt: string;
  handwriting?: HandwritingDocument;
};

export type FocusSession = {
  id: string;
  subjectId: string;
  durationMinutes: number;
  completedAt: string;
};

export type StudyMaterial = {
  id: string;
  subjectId: string;
  title: string;
  kind: "link" | "text";
  content: string;
  createdAt: string;
};

export type FlashcardRating = "again" | "hard" | "easy";

export type Flashcard = {
  id: string;
  subjectId: string;
  front: string;
  back: string;
  intervalDays: number;
  nextReview: string;
};

export type StudyGoal = {
  id: string;
  subjectId: string;
  title: string;
  targetMinutes: number;
  deadline: string;
  completed: boolean;
};

export type QuizAttempt = {
  id: string;
  subjectId: string;
  correct: number;
  total: number;
  completedAt: string;
};

export type BingoCell = {
  id: string;
  label: string;
  completed: boolean;
};

export type BingoBoard = {
  id: string;
  subjectId: string;
  cells: BingoCell[];
  createdAt: string;
};

export type HomeworkItem = {
  id: string;
  title: string;
  completed: boolean;
};

export type HomeworkList = {
  id: string;
  subjectId: string;
  title: string;
  items: HomeworkItem[];
  createdAt: string;
};

export type WorkspaceState = {
  version: typeof WORKSPACE_VERSION;
  subjects: Subject[];
  tasks: StudyTask[];
  events: StudyEvent[];
  habits: Habit[];
  notebooks: StudyNotebook[];
  notes: StudyNote[];
  focusSessions: FocusSession[];
  materials: StudyMaterial[];
  flashcards: Flashcard[];
  goals: StudyGoal[];
  quizAttempts: QuizAttempt[];
  bingoBoards: BingoBoard[];
  homeworkLists: HomeworkList[];
  focusPreferences: FocusPreferences;
  studyPreferences: StudyPreferences;
};

export type WorkspaceAction =
  | { type: "subject/added"; name: string; color: string }
  | { type: "task/added"; title: string; subjectId: string; dueDate: string }
  | { type: "task/toggled"; id: string }
  | { type: "event/added"; title: string; subjectId: string; date: string; time: string }
  | { type: "habit/added"; title: string }
  | { type: "habit/toggled"; id: string; date: string }
  | {
      type: "notebook/added";
      id: string;
      title: string;
      subjectId: string;
      createdAt: string;
    }
  | { type: "notebook/removed"; ids: string[] }
  | { type: "notebook/page-moved"; notebookId: string; pageId: string; direction: -1 | 1 }
  | {
      type: "note/asset-updated";
      noteId: string;
      assetId: string;
      dataUrl: string;
      handwriting: HandwritingDocument;
      updatedAt: string;
    }
  | { type: "note/added"; id: string; notebookId: string; subjectId: string; updatedAt: string }
  | { type: "note/updated"; id: string; title: string; content: string; updatedAt: string }
  | {
      type: "note/asset-added";
      noteId: string;
      kind: NoteAsset["kind"];
      name: string;
      dataUrl: string;
      createdAt: string;
      handwriting?: HandwritingDocument;
    }
  | { type: "note/asset-removed"; noteId: string; assetId: string; updatedAt: string }
  | {
      type: "focus/recorded";
      subjectId: string;
      durationMinutes: number;
      completedAt: string;
    }
  | { type: "focus/preferences-updated"; preferences: FocusPreferences }
  | { type: "study/preferences-updated"; preferences: StudyPreferences }
  | {
      type: "material/added";
      subjectId: string;
      title: string;
      kind: StudyMaterial["kind"];
      content: string;
      createdAt: string;
    }
  | {
      type: "flashcard/added";
      subjectId: string;
      front: string;
      back: string;
      createdOn: string;
    }
  | {
      type: "flashcard/reviewed";
      id: string;
      rating: FlashcardRating;
      reviewedOn: string;
    }
  | {
      type: "goal/added";
      subjectId: string;
      title: string;
      targetMinutes: number;
      deadline: string;
    }
  | { type: "goal/toggled"; id: string }
  | {
      type: "quiz/recorded";
      subjectId: string;
      correct: number;
      total: number;
      completedAt: string;
    }
  | { type: "bingo/created"; subjectId: string; labels: string[]; createdAt: string }
  | { type: "bingo/cell-toggled"; boardId: string; cellId: string }
  | { type: "homework-list/added"; subjectId: string; title: string; createdAt: string }
  | { type: "homework-list/removed"; id: string }
  | { type: "homework-item/added"; listId: string; title: string }
  | { type: "homework-item/toggled"; listId: string; itemId: string }
  | { type: "homework-item/removed"; listId: string; itemId: string };

export function createWorkspaceId(prefix: string): string {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${suffix}`;
}

const createId = createWorkspaceId;

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createInitialWorkspace(): WorkspaceState {
  return {
    version: WORKSPACE_VERSION,
    subjects: [{ id: "subject-english", name: "Inglês", color: "#7257e8" }],
    tasks: [],
    events: [],
    habits: [],
    notebooks: [],
    notes: [],
    focusSessions: [],
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

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "subject/added":
      return {
        ...state,
        subjects: [
          ...state.subjects,
          { id: createId("subject"), name: action.name, color: action.color },
        ],
      };
    case "task/added":
      return {
        ...state,
        tasks: [
          ...state.tasks,
          {
            id: createId("task"),
            title: action.title,
            subjectId: action.subjectId,
            dueDate: action.dueDate,
            completed: false,
          },
        ],
      };
    case "task/toggled":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, completed: !task.completed } : task,
        ),
      };
    case "event/added":
      return {
        ...state,
        events: [
          ...state.events,
          {
            id: createId("event"),
            title: action.title,
            subjectId: action.subjectId,
            date: action.date,
            time: action.time,
          },
        ],
      };
    case "habit/added":
      return {
        ...state,
        habits: [
          ...state.habits,
          { id: createId("habit"), title: action.title, completedDates: [] },
        ],
      };
    case "habit/toggled":
      return {
        ...state,
        habits: state.habits.map((habit) => {
          if (habit.id !== action.id) return habit;
          const completed = habit.completedDates.includes(action.date);
          return {
            ...habit,
            completedDates: completed
              ? habit.completedDates.filter((date) => date !== action.date)
              : [...habit.completedDates, action.date],
          };
        }),
      };
    case "notebook/added":
      return {
        ...state,
        notebooks: [
          {
            id: action.id,
            title: action.title,
            subjectId: action.subjectId,
            createdAt: action.createdAt,
            pageIds: [],
          },
          ...state.notebooks,
        ],
      };
    case "notebook/removed": {
      const ids = new Set(action.ids);
      const pageIds = new Set(
        state.notebooks
          .filter((notebook) => ids.has(notebook.id))
          .flatMap((notebook) => notebook.pageIds),
      );
      return {
        ...state,
        notebooks: state.notebooks.filter((notebook) => !ids.has(notebook.id)),
        notes: state.notes.filter((note) => !pageIds.has(note.id)),
      };
    }
    case "notebook/page-moved":
      return {
        ...state,
        notebooks: state.notebooks.map((notebook) => {
          if (notebook.id !== action.notebookId) return notebook;
          const index = notebook.pageIds.indexOf(action.pageId);
          const nextIndex = index + action.direction;
          if (index < 0 || nextIndex < 0 || nextIndex >= notebook.pageIds.length) return notebook;
          const pageIds = [...notebook.pageIds];
          [pageIds[index], pageIds[nextIndex]] = [pageIds[nextIndex]!, pageIds[index]!];
          return { ...notebook, pageIds };
        }),
      };
    case "note/added":
      return {
        ...state,
        notebooks: state.notebooks.map((notebook) =>
          notebook.id === action.notebookId
            ? { ...notebook, pageIds: [action.id, ...notebook.pageIds] }
            : notebook,
        ),
        notes: [
          {
            id: action.id,
            title: "Nova folha",
            content: "",
            subjectId: action.subjectId,
            updatedAt: action.updatedAt,
            assets: [],
          },
          ...state.notes,
        ],
      };
    case "note/asset-added":
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.noteId
            ? {
                ...note,
                updatedAt: action.createdAt,
                assets: [
                  ...note.assets,
                  {
                    id: createId("asset"),
                    kind: action.kind,
                    name: action.name,
                    dataUrl: action.dataUrl,
                    createdAt: action.createdAt,
                    ...(action.handwriting ? { handwriting: action.handwriting } : {}),
                  },
                ],
              }
            : note,
        ),
      };
    case "note/asset-updated":
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.noteId
            ? {
                ...note,
                updatedAt: action.updatedAt,
                assets: note.assets.map((asset) =>
                  asset.id === action.assetId
                    ? { ...asset, dataUrl: action.dataUrl, handwriting: action.handwriting }
                    : asset,
                ),
              }
            : note,
        ),
      };
    case "note/asset-removed":
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.noteId
            ? {
                ...note,
                updatedAt: action.updatedAt,
                assets: note.assets.filter((asset) => asset.id !== action.assetId),
              }
            : note,
        ),
      };
    case "note/updated":
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.id
            ? {
                ...note,
                title: action.title,
                content: action.content,
                updatedAt: action.updatedAt,
              }
            : note,
        ),
      };
    case "focus/recorded":
      return {
        ...state,
        focusSessions: [
          ...state.focusSessions,
          {
            id: createId("focus"),
            subjectId: action.subjectId,
            durationMinutes: action.durationMinutes,
            completedAt: action.completedAt,
          },
        ],
      };
    case "focus/preferences-updated":
      return { ...state, focusPreferences: action.preferences };
    case "study/preferences-updated": {
      const hasProgramming = action.preferences.programming !== "nenhum";
      const alreadyHasProgramming = state.subjects.some(
        (subject) => subject.name.toLocaleLowerCase("pt-BR") === "programação",
      );
      return {
        ...state,
        studyPreferences: action.preferences,
        subjects:
          hasProgramming && !alreadyHasProgramming
            ? [
                ...state.subjects,
                { id: "subject-programming", name: "Programação", color: "#4070c9" },
              ]
            : state.subjects,
      };
    }
    case "material/added":
      return {
        ...state,
        materials: [
          {
            id: createId("material"),
            subjectId: action.subjectId,
            title: action.title,
            kind: action.kind,
            content: action.content,
            createdAt: action.createdAt,
          },
          ...state.materials,
        ],
      };
    case "flashcard/added":
      return {
        ...state,
        flashcards: [
          ...state.flashcards,
          {
            id: createId("flashcard"),
            subjectId: action.subjectId,
            front: action.front,
            back: action.back,
            intervalDays: 0,
            nextReview: action.createdOn,
          },
        ],
      };
    case "flashcard/reviewed":
      return {
        ...state,
        flashcards: state.flashcards.map((card) => {
          if (card.id !== action.id) return card;
          const intervalDays =
            action.rating === "again"
              ? 0
              : action.rating === "hard"
                ? Math.max(1, card.intervalDays)
                : card.intervalDays === 0
                  ? 3
                  : card.intervalDays * 2;
          return {
            ...card,
            intervalDays,
            nextReview: addDays(action.reviewedOn, intervalDays),
          };
        }),
      };
    case "goal/added":
      return {
        ...state,
        goals: [
          ...state.goals,
          {
            id: createId("goal"),
            subjectId: action.subjectId,
            title: action.title,
            targetMinutes: action.targetMinutes,
            deadline: action.deadline,
            completed: false,
          },
        ],
      };
    case "goal/toggled":
      return {
        ...state,
        goals: state.goals.map((goal) =>
          goal.id === action.id ? { ...goal, completed: !goal.completed } : goal,
        ),
      };
    case "quiz/recorded":
      return {
        ...state,
        quizAttempts: [
          ...state.quizAttempts,
          {
            id: createId("quiz"),
            subjectId: action.subjectId,
            correct: action.correct,
            total: action.total,
            completedAt: action.completedAt,
          },
        ],
      };
    case "bingo/created":
      return {
        ...state,
        bingoBoards: [
          {
            id: createId("bingo"),
            subjectId: action.subjectId,
            createdAt: action.createdAt,
            cells: action.labels.slice(0, 9).map((label) => ({
              id: createId("bingo-cell"),
              label,
              completed: false,
            })),
          },
          ...state.bingoBoards.filter((board) => board.subjectId !== action.subjectId),
        ],
      };
    case "bingo/cell-toggled":
      return {
        ...state,
        bingoBoards: state.bingoBoards.map((board) =>
          board.id === action.boardId
            ? {
                ...board,
                cells: board.cells.map((cell) =>
                  cell.id === action.cellId ? { ...cell, completed: !cell.completed } : cell,
                ),
              }
            : board,
        ),
      };
    case "homework-list/added":
      return {
        ...state,
        homeworkLists: [
          {
            id: createId("homework-list"),
            subjectId: action.subjectId,
            title: action.title,
            items: [],
            createdAt: action.createdAt,
          },
          ...state.homeworkLists,
        ],
      };
    case "homework-list/removed":
      return {
        ...state,
        homeworkLists: state.homeworkLists.filter((list) => list.id !== action.id),
      };
    case "homework-item/added":
      return {
        ...state,
        homeworkLists: state.homeworkLists.map((list) =>
          list.id === action.listId
            ? {
                ...list,
                items: [
                  ...list.items,
                  { id: createId("homework-item"), title: action.title, completed: false },
                ],
              }
            : list,
        ),
      };
    case "homework-item/toggled":
      return {
        ...state,
        homeworkLists: state.homeworkLists.map((list) =>
          list.id === action.listId
            ? {
                ...list,
                items: list.items.map((item) =>
                  item.id === action.itemId ? { ...item, completed: !item.completed } : item,
                ),
              }
            : list,
        ),
      };
    case "homework-item/removed":
      return {
        ...state,
        homeworkLists: state.homeworkLists.map((list) =>
          list.id === action.listId
            ? { ...list, items: list.items.filter((item) => item.id !== action.itemId) }
            : list,
        ),
      };
  }
}

const DEFAULT_BINGO_PROMPTS = [
  "Estude por 25 minutos",
  "Revise cinco flashcards",
  "Faça uma anotação curta",
  "Explique um conceito em voz alta",
  "Conclua uma tarefa pendente",
  "Revise um erro antigo",
  "Organize o material da matéria",
  "Faça uma pausa sem tela",
  "Planeje o próximo estudo",
] as const;

export function buildBingoLabels(flashcardFronts: readonly string[]): string[] {
  const fromCards = flashcardFronts
    .map((front) => front.trim())
    .filter((front, index, values) => front.length > 0 && values.indexOf(front) === index)
    .map((front) => `Revise: ${front}`);

  return [...fromCards, ...DEFAULT_BINGO_PROMPTS].slice(0, 9);
}

export function hasBingo(board: BingoBoard): boolean {
  if (board.cells.length !== 9) return false;
  const completed = board.cells.map((cell) => cell.completed);
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ] as const;

  return lines.some((line) => line.every((index) => completed[index]));
}

export function minutesFocusedOn(state: WorkspaceState, dateKey: string): number {
  return state.focusSessions
    .filter((session) => toDateKey(new Date(session.completedAt)) === dateKey)
    .reduce((total, session) => total + session.durationMinutes, 0);
}

export function minutesFocusedForSubject(state: WorkspaceState, subjectId: string): number {
  return state.focusSessions
    .filter((session) => session.subjectId === subjectId)
    .reduce((total, session) => total + session.durationMinutes, 0);
}

export function dueFlashcards(state: WorkspaceState, dateKey: string): Flashcard[] {
  return state.flashcards.filter((card) => card.nextReview <= dateKey);
}
