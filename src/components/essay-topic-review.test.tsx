import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EssayTopicReview } from "./essay-topic-review";
class TopicWorker {
  static last: TopicWorker;
  static created = 0;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    TopicWorker.last = this;
    TopicWorker.created++;
  }
  result(id: number) {
    this.onmessage?.({
      data: {
        id,
        result: {
          status: "off-topic",
          reason: "different",
          evidence: [{ start: 0, end: 5, text: "Outro", relation: "uncertain" }],
        },
      },
    } as MessageEvent);
  }
}
afterEach(cleanup);
const props = {
  text: "Outro assunto.",
  topicId: "essay-01",
  title: "Cidadania digital",
  onLocate: vi.fn(),
};
it("starts automatically when the delivered essay result mounts", () => {
  vi.stubGlobal("Worker", TopicWorker);
  const before = TopicWorker.created;
  const { rerender } = render(<EssayTopicReview {...props} />);
  expect(TopicWorker.created).toBe(before + 1);
  expect(screen.queryByRole("button", { name: "Baixar modelo e analisar tema" })).toBeNull();
  expect(screen.queryByText(/Análise experimental no aparelho/)).toBeNull();
  expect(TopicWorker.created).toBe(before + 1);
  rerender(<EssayTopicReview {...props} />);
  expect(TopicWorker.created).toBe(before + 1);
  expect(TopicWorker.last.postMessage).toHaveBeenCalledOnce();
  expect(TopicWorker.last.postMessage).toHaveBeenCalledWith({
    id: 1,
    text: props.text,
    topicId: props.topicId,
  });
});
it("shows provisional evidence, never a zero grade, and locates the selected passage", () => {
  vi.stubGlobal("Worker", TopicWorker);
  const locate = vi.fn();
  render(<EssayTopicReview {...props} onLocate={locate} />);
  act(() => TopicWorker.last.result(1));
  expect(screen.getByRole("status").textContent).toBe("Possível fuga ao tema");
  expect(screen.getByText(/não atribui zero/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ver trecho na redação" }));
  expect(locate).toHaveBeenCalledWith(0, 5);
});
it("cancels work and ignores a late result", () => {
  vi.stubGlobal("Worker", TopicWorker);
  render(<EssayTopicReview {...props} />);
  const previous = TopicWorker.last;
  fireEvent.click(screen.getByRole("button", { name: "Cancelar análise" }));
  act(() => previous.result(1));
  expect(previous.terminate).toHaveBeenCalled();
  expect(screen.queryByText("Possível fuga ao tema")).toBeNull();
});
it("invalidates analysis when the essay revision or topic changes", () => {
  vi.stubGlobal("Worker", TopicWorker);
  const { rerender } = render(<EssayTopicReview {...props} />);
  const previous = TopicWorker.last;
  rerender(<EssayTopicReview {...props} text="Nova redação." topicId="essay-02" />);
  act(() => previous.result(1));
  expect(previous.terminate).toHaveBeenCalled();
  expect(screen.queryByText("Possível fuga ao tema")).toBeNull();
  expect(TopicWorker.last.postMessage).toHaveBeenCalledWith({
    id: 3,
    text: "Nova redação.",
    topicId: "essay-02",
  });
});
it("recovers from unsupported or failed local execution without touching the text", () => {
  vi.stubGlobal("Worker", TopicWorker);
  render(<EssayTopicReview {...props} />);
  act(() => TopicWorker.last.onerror?.());
  expect(screen.getByRole("alert").textContent).toContain("Seu texto");
  fireEvent.click(screen.getByRole("button", { name: "Tentar análise novamente" }));
  act(() => TopicWorker.last.result(2));
  expect(screen.getByRole("status").textContent).toBe("Possível fuga ao tema");
});
