import { describe, expect, it } from "vitest";
import { createInitialWorkspace } from "./workspace";
import { buildStudyRoute } from "./study-route";

describe("buildStudyRoute", () => {
  it("indica a Biblioteca quando ainda não há material para estudar", () => {
    const route = buildStudyRoute(createInitialWorkspace(), "2026-09-20");
    expect(route.view).toBe("library");
    expect(route.actionLabel).toBe("Abrir Biblioteca");
  });

  it("prioriza flashcards que precisam de revisão", () => {
    const workspace = createInitialWorkspace();
    workspace.flashcards = [
      {
        id: "card-1",
        subjectId: "subject-english",
        front: "Study",
        back: "Estudar",
        intervalDays: 3,
        nextReview: "2026-09-20",
      },
    ];
    const route = buildStudyRoute(workspace, "2026-09-20");
    expect(route.view).toBe("learn");
    expect(route.label).toBe("Revisão de hoje");
  });

  it("sugere Cadernos para a preferência visual com conteúdo disponível", () => {
    const workspace = createInitialWorkspace();
    workspace.materials = [
      {
        id: "material-1",
        subjectId: "subject-english",
        title: "Verb tenses",
        kind: "text",
        content: "Present simple",
        createdAt: "2026-09-20T10:00:00.000Z",
      },
    ];
    workspace.studyPreferences = {
      modalities: ["visual"],
      processing: "sequencial",
      rhythm: "focado",
      programming: "nenhum",
    };
    expect(buildStudyRoute(workspace, "2026-09-20").view).toBe("notes");
  });
});
