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
  const { container } = render(
    <StudentDestinations workspace={workspace} dispatch={vi.fn()} onNavigate={navigate} />,
  );
  expect(container.querySelector(".student-island-art")?.getAttribute("src")).toContain(
    "school-small.webp",
  );
  expect(container.querySelector(".student-focus-art .pomodoro-tomato")).toBeTruthy();
  expect(container.querySelector(".student-focus-art .focus-rose")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Explorar as ilhas/ }));
  expect(navigate).toHaveBeenCalledWith("learn");
  expect(sessionStorage.getItem("olena:enter-mathematics")).toBe("school");
  sessionStorage.clear();
});
