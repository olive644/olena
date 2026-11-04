import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { StudentDestinations } from "./student-destinations";
import { createInitialWorkspace } from "../domain/workspace";
import { saveStudentResume } from "../data/student-resume";
it("retoma a última parte matemática praticada e usa somente a última modalidade de foco", () => {
  const workspace = createInitialWorkspace();
  workspace.practiceActivities = [
    {
      id: "a",
      islandId: "mathematics:school",
      islandName: "Matemática",
      answers: 1,
      correct: 1,
      completedAt: new Date(Date.now() - 1000).toISOString(),
    },
  ];
  workspace.practiceActivities.push(
    {
      ...workspace.practiceActivities[0]!,
      id: "language",
      islandId: "languages",
      completedAt: new Date().toISOString(),
    },
    {
      ...workspace.practiceActivities[0]!,
      id: "future",
      islandId: "mathematics:foundations",
      completedAt: "2099-01-01",
    },
  );
  saveStudentResume({ focus: { mode: "pomodoro", at: Date.now() } });
  const navigate = vi.fn();
  const { container } = render(<StudentDestinations workspace={workspace} onNavigate={navigate} />);
  expect(container.querySelector(".student-island-art")?.getAttribute("src")).toContain(
    "school-small.webp",
  );
  expect(container.querySelector(".student-focus-art .pomodoro-tomato")).toBeTruthy();
  expect(container.querySelector(".student-focus-art .pomodoro-tomato-live")).toBeTruthy();
  expect(container.querySelector(".student-focus-art .focus-rose")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Explorar as ilhas/ }));
  expect(navigate).toHaveBeenCalledWith("learn");
  expect(sessionStorage.getItem("olena:enter-mathematics")).toBe("school");
  sessionStorage.clear();
});
it("mostra e abre a última ilha praticada quando é o Cais das Boas-vindas de Inglês", () => {
  const workspace = createInitialWorkspace();
  const base = {
    islandName: "Cais dos Encontros · Inglês",
    answers: 2,
    correct: 2,
  };
  workspace.practiceActivities = [
    {
      ...base,
      id: "math",
      islandId: "mathematics:school",
      islandName: "Matemática",
      completedAt: new Date(Date.now() - 60000).toISOString(),
    },
    {
      ...base,
      id: "english",
      islandId: "english",
      completedAt: new Date(Date.now() - 1000).toISOString(),
      englishAttempt: {
        curriculum: 4,
        part: 0,
        mode: "practice",
        questions: [1, 2],
        correctQuestions: [1, 2],
      },
    },
  ];
  const navigate = vi.fn();
  const { container } = render(<StudentDestinations workspace={workspace} onNavigate={navigate} />);
  const art = container.querySelector(".student-island-art");
  expect(art?.getAttribute("src")).toBe("/languages/english-parts/welcome.webp");
  expect(art?.getAttribute("data-island")).toBe("english");
  fireEvent.click(screen.getByRole("button", { name: /Explorar as ilhas/ }));
  expect(navigate).toHaveBeenCalledWith("learn");
  expect(sessionStorage.getItem("olena:enter-english")).toBe("1");
  expect(sessionStorage.getItem("olena:enter-mathematics")).toBeNull();
  sessionStorage.clear();
});
it("volta à matemática quando ela é a mais recente depois do Inglês", () => {
  const workspace = createInitialWorkspace();
  workspace.practiceActivities = [
    {
      id: "english",
      islandId: "english",
      islandName: "Inglês",
      answers: 1,
      correct: 1,
      completedAt: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: "math",
      islandId: "mathematics:school",
      islandName: "Matemática",
      answers: 1,
      correct: 1,
      completedAt: new Date(Date.now() - 1000).toISOString(),
    },
  ];
  const { container } = render(<StudentDestinations workspace={workspace} onNavigate={vi.fn()} />);
  expect(container.querySelector(".student-island-art")?.getAttribute("src")).toContain(
    "school-small.webp",
  );
});
