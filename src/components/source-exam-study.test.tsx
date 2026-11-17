import { downloadSourceExamPdf } from "../data/source-exam-export";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
vi.mock("../hooks/use-profile-handle", () => ({
  useProfileHandle: () => ({ handle: { username: "luna.estuda" } }),
}));
vi.mock("../data/source-exam-export", () => ({ downloadSourceExamPdf: vi.fn(async () => {}) }));
import { SourceExamStudy } from "./source-exam-study";
const quiz = {
  version: 1 as const,
  difficulty: "easy" as const,
  questions: [
    {
      prompt: "Ano _____",
      options: ["1943", "1945", "1955"],
      answer: 1,
      explanation: "Concluído em 1945.",
      sourceId: "s",
      sourceTitle: "Fonte.pdf",
      page: 1,
    },
  ],
};
afterEach(() => {
  cleanup();
  localStorage.removeItem("helena.profile.v1");
  vi.useRealTimers();
});
function open(complete = vi.fn()) {
  render(<SourceExamStudy title="História" quiz={quiz} onComplete={complete} onClose={vi.fn()} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Começar prova" })[0]!);
  return complete;
}
it("só revela correção após entregar e permite alterar respostas", () => {
  const complete = open();
  fireEvent.click(screen.getByRole("button", { name: /A\s*1943/ }));
  fireEvent.click(screen.getByRole("button", { name: /B\s*1945/ }));
  expect(screen.queryByText("Concluído em 1945.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Corrigir simulado" }));
  expect(screen.getByText("Você respondeu 1 de 1 questões.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Continuar prova" }));
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Corrigir simulado" }));
  fireEvent.click(screen.getByRole("button", { name: "Entregar e corrigir" }));
  expect(complete).toHaveBeenCalledExactlyOnceWith(1, 1);
  expect(screen.getByRole("img", { name: "Assinatura Olena" })).toBeTruthy();
  expect(screen.getByText("Concluído em 1945.")).toBeTruthy();
  expect(screen.getByRole("button", { name: /B\s*1945/ }).hasAttribute("disabled")).toBe(true);
});
it("corrige em branco como zero e reinicia sem respostas antigas", () => {
  const complete = open();
  fireEvent.click(screen.getByRole("button", { name: "Corrigir simulado" }));
  fireEvent.click(screen.getByRole("button", { name: "Entregar e corrigir" }));
  expect(complete).toHaveBeenCalledExactlyOnceWith(0, 1);
  expect(screen.getByText("Não respondida")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Refazer prova" }));
  expect(screen.queryByText("Concluído em 1945.")).toBeNull();
  expect(screen.getByRole("timer").textContent).toBe("2:00");
});
it("entrega automaticamente ao esgotar o tempo", () => {
  vi.useFakeTimers();
  const complete = open();
  fireEvent.click(screen.getByRole("button", { name: /B\s*1945/ }));
  // fireEvent wraps React updates; advancing time must be wrapped too.
  fireEvent(window, new Event("focus"));
  vi.setSystemTime(Date.now() + 120000);
  return import("@testing-library/react").then(({ act }) => {
    act(() => vi.advanceTimersByTime(1000));
    expect(complete).toHaveBeenCalledExactlyOnceWith(1, 1);
  });
});

it("preenche o apelido do perfil e remove turma e cartões de pontuação da capa", () => {
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Luna" }));
  render(<SourceExamStudy title="História" quiz={quiz} onComplete={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getByRole("textbox", { name: "Nome" })).toHaveProperty("value", "luna.estuda");
  expect(screen.queryByRole("textbox", { name: "Turma" })).toBeNull();
  expect(screen.queryByText("Pontuação")).toBeNull();
  expect(screen.getByRole("img", { name: "Olena" }).getAttribute("src")).toBe(
    "/olena-favicon-192.png",
  );
});

it("baixa PDF pelo botão de ícone sem abrir impressão", async () => {
  open();
  const download = screen.getByRole("button", { name: "Baixar PDF" });
  expect(download.textContent).toBe("");
  fireEvent.click(download);
  const { waitFor } = await import("@testing-library/react");
  await waitFor(() => expect(downloadSourceExamPdf).toHaveBeenCalled());
  expect(screen.queryByText("Imprimir / PDF")).toBeNull();
});
