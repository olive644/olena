import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EssayProofreading } from "./essay-proofreading";

class FakeWorker {
  static last: FakeWorker;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.last = this;
  }
  respond(id = 1) {
    this.onmessage?.({
      data: {
        id,
        result: {
          limited: false,
          issues: [{ start: 2, end: 10, word: "educasão", suggestions: ["educação"] }],
        },
      },
    } as MessageEvent);
  }
}
afterEach(cleanup);
it("does not run correction before submitting", () => {
  vi.stubGlobal("Worker", FakeWorker);
  const submit = vi.fn();
  render(
    <EssayProofreading text="A educasão" onChange={vi.fn()} onLocate={vi.fn()} onSubmit={submit} />,
  );
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Entregar redação" }));
  expect(submit).toHaveBeenCalledOnce();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("heading", { name: "Redação entregue!" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Entregar redação" })).toBeNull();
});
it("applies an explicit correction and terminates its worker on unmount", () => {
  vi.stubGlobal("Worker", FakeWorker);
  const change = vi.fn();
  const { unmount } = render(
    <EssayProofreading text="A educasão" onChange={change} onLocate={vi.fn()} onSubmit={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Entregar redação" }));
  act(() => FakeWorker.last.respond());
  // A revisão fica no painel "Redação", fechado e inerte até o aluno abri-lo.
  fireEvent.click(screen.getByRole("button", { name: "Redação" }));
  fireEvent.click(screen.getByText("Revisão ortográfica"));
  fireEvent.click(screen.getByRole("button", { name: "Substituir educasão por educação" }));
  expect(change).toHaveBeenCalledWith("A educação");
  unmount();
  expect(FakeWorker.last.terminate).toHaveBeenCalled();
});
it("ignores a word without editing and refuses a stale response", () => {
  vi.stubGlobal("Worker", FakeWorker);
  const change = vi.fn();
  const { rerender } = render(
    <EssayProofreading text="A educasão" onChange={change} onLocate={vi.fn()} onSubmit={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Entregar redação" }));
  act(() => FakeWorker.last.respond());
  // A revisão fica no painel "Redação", fechado e inerte até o aluno abri-lo.
  fireEvent.click(screen.getByRole("button", { name: "Redação" }));
  fireEvent.click(screen.getByRole("button", { name: "Ignorar palavra" }));
  expect(change).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.click(screen.getByRole("button", { name: "Entregar redação" }));
  rerender(
    <EssayProofreading
      text="Uma redação nova"
      onChange={change}
      onLocate={vi.fn()}
      onSubmit={vi.fn()}
    />,
  );
  act(() => FakeWorker.last.respond(2));
  expect(screen.queryByRole("button", { name: "Substituir educasão por educação" })).toBeNull();
  expect(screen.getByText(/O texto mudou/)).toBeTruthy();
});
it("reports failure without changing the draft and allows retry", () => {
  vi.stubGlobal("Worker", FakeWorker);
  const change = vi.fn();
  render(
    <EssayProofreading text="A educasão" onChange={change} onLocate={vi.fn()} onSubmit={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Entregar redação" }));
  // A revisão fica no painel "Redação", fechado e inerte até o aluno abri-lo.
  fireEvent.click(screen.getByRole("button", { name: "Redação" }));
  fireEvent.click(screen.getByText("Revisão ortográfica"));
  act(() => FakeWorker.last.onerror?.());
  expect(screen.getByRole("alert").textContent).toContain("Seu texto foi preservado");
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  act(() => FakeWorker.last.respond(2));
  expect(screen.getByRole("button", { name: "Substituir educasão por educação" })).toBeTruthy();
  expect(change).not.toHaveBeenCalled();
});
