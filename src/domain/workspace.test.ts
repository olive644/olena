import { describe, expect, it } from "vitest";
import {
  buildBingoLabels,
  createInitialWorkspace,
  dueFlashcards,
  hasBingo,
  minutesFocusedOn,
  workspaceReducer,
} from "./workspace";
import type { StudyPreferences } from "./study-preferences";
import type { HandwritingDocument } from "./handwriting";

describe("workspaceReducer", () => {
  it("reordena folhas dentro do caderno sem alterar o conteúdo", () => {
    const initial = createInitialWorkspace();
    const withNotebook = workspaceReducer(initial, {
      type: "notebook/added",
      id: "book",
      title: "Caderno",
      subjectId: initial.subjects[0]!.id,
      createdAt: "2026-09-20",
    });
    const first = workspaceReducer(withNotebook, {
      type: "note/added",
      id: "first",
      notebookId: "book",
      subjectId: initial.subjects[0]!.id,
      updatedAt: "2026-09-20",
    });
    const second = workspaceReducer(first, {
      type: "note/added",
      id: "second",
      notebookId: "book",
      subjectId: initial.subjects[0]!.id,
      updatedAt: "2026-09-20",
    });
    expect(second.notebooks[0]?.pageIds).toEqual(["second", "first"]);
    const reordered = workspaceReducer(second, {
      type: "notebook/page-moved",
      notebookId: "book",
      pageId: "first",
      direction: -1,
    });
    expect(reordered.notebooks[0]?.pageIds).toEqual(["first", "second"]);
    expect(reordered.notes).toEqual(second.notes);
  });
  it("salva preferências de estudo e cria Programação uma única vez", () => {
    const preferences: StudyPreferences = {
      modalities: ["visual", "pratico"],
      processing: "global",
      rhythm: "difuso",
      programming: "python-javascript",
    };
    const updated = workspaceReducer(createInitialWorkspace(), {
      type: "study/preferences-updated",
      preferences,
    });
    expect(updated.studyPreferences).toEqual(preferences);
    expect(updated.subjects.filter((subject) => subject.name === "Programação")).toHaveLength(1);

    const repeated = workspaceReducer(updated, { type: "study/preferences-updated", preferences });
    expect(repeated.subjects.filter((subject) => subject.name === "Programação")).toHaveLength(1);
  });

  it("salva preferências do Pomodoro no workspace sincronizado", () => {
    const updated = workspaceReducer(createInitialWorkspace(), {
      type: "focus/preferences-updated",
      preferences: { pomodoroMinutes: 50, longBreaks: false },
    });
    expect(updated.focusPreferences).toEqual({ pomodoroMinutes: 50, longBreaks: false });
  });

  it("conecta tarefas e sessões de foco ao espaço de estudos", () => {
    const initial = createInitialWorkspace();
    const withTask = workspaceReducer(initial, {
      type: "task/added",
      title: "Estudar verbos",
      subjectId: "subject-english",
      dueDate: "2026-08-29",
    });
    const task = withTask.tasks[0];
    expect(task?.title).toBe("Estudar verbos");

    const completed = task
      ? workspaceReducer(withTask, { type: "task/toggled", id: task.id })
      : withTask;
    expect(completed.tasks[0]?.completed).toBe(true);

    const focused = workspaceReducer(completed, {
      type: "focus/recorded",
      subjectId: "subject-english",
      durationMinutes: 25,
      completedAt: "2026-08-29T18:00:00.000Z",
    });
    expect(minutesFocusedOn(focused, "2026-08-29")).toBe(25);
  });

  it("marca e desmarca o mesmo hábito no dia", () => {
    const withHabit = workspaceReducer(createInitialWorkspace(), {
      type: "habit/added",
      title: "Revisar flashcards",
    });
    const habit = withHabit.habits[0];
    expect(habit).toBeDefined();
    if (!habit) return;

    const checked = workspaceReducer(withHabit, {
      type: "habit/toggled",
      id: habit.id,
      date: "2026-08-29",
    });
    expect(checked.habits[0]?.completedDates).toEqual(["2026-08-29"]);

    const unchecked = workspaceReducer(checked, {
      type: "habit/toggled",
      id: habit.id,
      date: "2026-08-29",
    });
    expect(unchecked.habits[0]?.completedDates).toEqual([]);
  });

  it("agenda revisões de flashcards conforme a dificuldade", () => {
    const withCard = workspaceReducer(createInitialWorkspace(), {
      type: "flashcard/added",
      subjectId: "subject-english",
      front: "Improve",
      back: "Melhorar",
      createdOn: "2026-08-30",
    });
    const card = withCard.flashcards[0];
    expect(dueFlashcards(withCard, "2026-08-30")).toHaveLength(1);
    if (!card) return;

    const reviewed = workspaceReducer(withCard, {
      type: "flashcard/reviewed",
      id: card.id,
      rating: "easy",
      reviewedOn: "2026-08-30",
    });
    expect(reviewed.flashcards[0]?.intervalDays).toBe(3);
    expect(reviewed.flashcards[0]?.nextReview).toBe("2026-09-02");
    expect(dueFlashcards(reviewed, "2026-08-30")).toHaveLength(0);
  });

  it("salva imagens na anotação e permite removê-las", () => {
    const withNotebook = workspaceReducer(createInitialWorkspace(), {
      type: "notebook/added",
      id: "notebook-english",
      title: "Caderno de Inglês",
      subjectId: "subject-english",
      createdAt: "2026-08-31T09:59:00.000Z",
    });
    const withNote = workspaceReducer(withNotebook, {
      type: "note/added",
      id: "note-english-1",
      notebookId: "notebook-english",
      subjectId: "subject-english",
      updatedAt: "2026-08-31T10:00:00.000Z",
    });
    const note = withNote.notes[0];
    expect(withNote.notebooks[0]?.pageIds).toEqual(["note-english-1"]);
    if (!note) return;

    const withAsset = workspaceReducer(withNote, {
      type: "note/asset-added",
      noteId: note.id,
      kind: "drawing",
      name: "Mapa desenhado",
      dataUrl: "data:image/png;base64,AAAA",
      createdAt: "2026-08-31T10:05:00.000Z",
    });
    const asset = withAsset.notes[0]?.assets[0];
    expect(asset).toMatchObject({ kind: "drawing", name: "Mapa desenhado" });
    if (!asset) return;

    const handwriting: HandwritingDocument = {
      version: 1,
      paper: "ruled",
      strokes: [
        {
          id: "stroke-1",
          tool: "pen",
          color: "#17151c",
          width: 5,
          points: [{ x: 20, y: 30, pressure: 0.5 }],
        },
      ],
    };
    const updated = workspaceReducer(withAsset, {
      type: "note/asset-updated",
      noteId: note.id,
      assetId: asset.id,
      dataUrl: "data:image/png;base64,BBBB",
      handwriting,
      updatedAt: "2026-08-31T10:05:30.000Z",
    });
    expect(updated.notes[0]?.assets[0]).toMatchObject({
      id: asset.id,
      handwriting,
      dataUrl: "data:image/png;base64,BBBB",
    });

    const removed = workspaceReducer(updated, {
      type: "note/asset-removed",
      noteId: note.id,
      assetId: asset.id,
      updatedAt: "2026-08-31T10:06:00.000Z",
    });
    expect(removed.notes[0]?.assets).toEqual([]);
  });

  it("cria uma cartela e reconhece uma sequência de bingo", () => {
    const labels = buildBingoLabels(["Present Perfect", "Phrasal verbs"]);
    expect(labels).toHaveLength(9);
    expect(labels[0]).toBe("Revise: Present Perfect");

    let workspace = workspaceReducer(createInitialWorkspace(), {
      type: "bingo/created",
      subjectId: "subject-english",
      labels,
      createdAt: "2026-08-31T10:00:00.000Z",
    });
    const board = workspace.bingoBoards[0];
    expect(board?.cells).toHaveLength(9);
    if (!board) return;

    for (const cell of board.cells.slice(0, 3)) {
      workspace = workspaceReducer(workspace, {
        type: "bingo/cell-toggled",
        boardId: board.id,
        cellId: cell.id,
      });
    }
    const completedBoard = workspace.bingoBoards[0];
    expect(completedBoard && hasBingo(completedBoard)).toBe(true);
  });

  it("cria uma lista de homework, adiciona itens e marca/remove itens", () => {
    let workspace = workspaceReducer(createInitialWorkspace(), {
      type: "homework-list/added",
      subjectId: "subject-english",
      title: "Lição de casa da semana",
      createdAt: "2026-08-31T10:00:00.000Z",
    });
    const list = workspace.homeworkLists[0];
    expect(list?.title).toBe("Lição de casa da semana");
    expect(list?.items).toEqual([]);
    if (!list) return;

    workspace = workspaceReducer(workspace, {
      type: "homework-item/added",
      listId: list.id,
      title: "Página 12 do livro",
    });
    const item = workspace.homeworkLists[0]?.items[0];
    expect(item?.title).toBe("Página 12 do livro");
    expect(item?.completed).toBe(false);
    if (!item) return;

    workspace = workspaceReducer(workspace, {
      type: "homework-item/toggled",
      listId: list.id,
      itemId: item.id,
    });
    expect(workspace.homeworkLists[0]?.items[0]?.completed).toBe(true);

    workspace = workspaceReducer(workspace, {
      type: "homework-item/removed",
      listId: list.id,
      itemId: item.id,
    });
    expect(workspace.homeworkLists[0]?.items).toEqual([]);

    workspace = workspaceReducer(workspace, { type: "homework-list/removed", id: list.id });
    expect(workspace.homeworkLists).toEqual([]);
  });
});
