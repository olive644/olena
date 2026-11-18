import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SourceQuizStudy } from "./source-quiz-study";
afterEach(cleanup);
it("verifica uma vez, explica a fonte e registra a conclusão", () => {
  const complete = vi.fn();
  render(
    <SourceQuizStudy
      title="Teste"
      quiz={{
        version: 1,
        difficulty: "easy",
        questions: [
          {
            prompt: "Em _____",
            options: ["1943", "1945", "1955"],
            answer: 1,
            explanation: "Em 1945.",
            sourceId: "s1",
            sourceTitle: "Fonte.pdf",
            page: 2,
          },
        ],
      }}
      onClose={vi.fn()}
      onComplete={complete}
    />,
  );
  expect(screen.getByRole("button", { name: "Verificar" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /B1945|B 1945/ }));
  fireEvent.click(screen.getByRole("button", { name: "Verificar" }));
  fireEvent.click(screen.getByRole("button", { name: "Por quê?" }));
  expect(screen.getByRole("status").textContent).toContain("Em 1945.");
  expect(screen.getByRole("status").textContent).toContain("Fonte.pdf");
  fireEvent.click(screen.getByRole("button", { name: "Entendi" }));
  expect(complete).toHaveBeenCalledExactlyOnceWith(1, 1);
  expect(screen.getByText("Quiz concluído")).toBeTruthy();
});

it("revisa erros só uma vez mesmo errando novamente, sem duplicar o registro", () => {
  const complete = vi.fn();
  render(
    <SourceQuizStudy
      title="Revisão"
      quiz={{
        version: 1,
        difficulty: "easy",
        questions: [
          {
            prompt: "Ano _____",
            options: ["1943", "1945", "1955"],
            answer: 1,
            explanation: "Ano 1945.",
            sourceId: "s",
            sourceTitle: "Fonte",
            page: 1,
          },
        ],
      }}
      onClose={vi.fn()}
      onComplete={complete}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /A\s*1943/ }));
  fireEvent.click(screen.getByRole("button", { name: "Verificar" }));
  fireEvent.click(screen.getByRole("button", { name: "Entendi" }));
  expect(screen.getByText("Vamos rever as perguntas que você errou.")).toBeTruthy();
  expect(complete).toHaveBeenCalledExactlyOnceWith(0, 1);
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.click(screen.getByRole("button", { name: /A\s*1943/ }));
  fireEvent.click(screen.getByRole("button", { name: "Verificar" }));
  fireEvent.click(screen.getByRole("button", { name: "Entendi" }));
  expect(screen.getByText("Quiz concluído")).toBeTruthy();
  expect(complete).toHaveBeenCalledTimes(1);
});
