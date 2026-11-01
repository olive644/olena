import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PaperSpeech } from "./paper-speech";

let systemReduce = false;
let media: EventTarget;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now());
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  media = new EventTarget();
  systemReduce = false;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: systemReduce,
    media: query,
    addEventListener: media.addEventListener.bind(media),
    removeEventListener: media.removeEventListener.bind(media),
  }));
});

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset["reduceMotion"];
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const visible = () =>
  [...document.querySelectorAll('.paper-speech__word[data-visible="true"]')].map(
    (word) => word.textContent,
  );
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
function hidden(value: boolean) {
  vi.spyOn(document, "hidden", "get").mockReturnValue(value);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
}

it("reveals words in order, pauses at punctuation and finishes after the final dwell", () => {
  const onWord = vi.fn();
  const onSpeakingChange = vi.fn();
  render(
    <PaperSpeech
      text="Oi, você chegou!"
      skipLabel="Mostrar tudo"
      onWord={onWord}
      onSpeakingChange={onSpeakingChange}
    />,
  );
  expect(visible()).toEqual([]);
  expect(onSpeakingChange.mock.calls).toEqual([[true]]);
  advance(0);
  expect(visible()).toEqual(["Oi,"]);
  const first = onWord.mock.calls[0]![0];
  expect(first).toEqual({ index: 0, word: "Oi,", durationMs: 492 });
  advance(first.durationMs - 1);
  expect(onWord).toHaveBeenCalledTimes(1);
  advance(1);
  expect(visible()).toEqual(["Oi,", "você"]);
  expect(onWord.mock.calls[1]![0]).toEqual({ index: 1, word: "você", durationMs: 336 });
  advance(336);
  expect(visible()).toEqual(["Oi,", "você", "chegou!"]);
  expect(onWord.mock.calls[2]![0]).toEqual({ index: 2, word: "chegou!", durationMs: 768 });
  expect(onSpeakingChange).toHaveBeenLastCalledWith(true);
  advance(768);
  expect(onSpeakingChange.mock.calls).toEqual([[true], [false]]);
  expect(vi.getTimerCount()).toBe(0);
  expect(screen.queryByRole("button", { name: "Mostrar tudo" })).toBeNull();
});

it("keeps full accessible text and all visual words mounted, including whitespace", () => {
  const text = "  Olá,\n  vamos estudar. ";
  const { container } = render(<PaperSpeech text={text} skipLabel="Mostrar tudo" />);
  expect(container.querySelector(".paper-speech__accessible")?.textContent).toBe(text);
  const visual = container.querySelector(".paper-speech__text");
  expect(visual?.getAttribute("aria-hidden")).toBe("true");
  expect(visual?.textContent).toBe(text);
  expect(container.querySelectorAll(".paper-speech__word")).toHaveLength(3);
  expect(container.querySelector("[aria-live]")).toBeNull();
  advance(0);
  expect(container.querySelectorAll(".paper-speech__word")).toHaveLength(3);
  expect(visible()).toEqual(["Olá,"]);
});

it("skips through a native button, ends speaking and cancels future word events", () => {
  const onWord = vi.fn();
  const onSpeakingChange = vi.fn();
  render(
    <PaperSpeech
      text="Um dois três"
      skipLabel="Ler tudo"
      onWord={onWord}
      onSpeakingChange={onSpeakingChange}
    />,
  );
  advance(0);
  const skip = screen.getByRole("button", { name: "Ler tudo" });
  expect(skip.getAttribute("type")).toBe("button");
  fireEvent.click(skip);
  expect(visible()).toEqual(["Um", "dois", "três"]);
  expect(onSpeakingChange.mock.calls).toEqual([[true], [false]]);
  expect(vi.getTimerCount()).toBe(0);
  advance(10000);
  expect(onWord).toHaveBeenCalledTimes(1);
});

it("shows immediate text without word effects and does not replay when immediate is removed", () => {
  const onWord = vi.fn();
  const onSpeakingChange = vi.fn();
  const props = { text: "Tudo pronto", skipLabel: "Mostrar tudo", onWord, onSpeakingChange };
  const { rerender } = render(<PaperSpeech {...props} immediate />);
  expect(visible()).toEqual(["Tudo", "pronto"]);
  expect(onSpeakingChange.mock.calls).toEqual([[false]]);
  rerender(<PaperSpeech {...props} />);
  advance(10000);
  expect(visible()).toEqual(["Tudo", "pronto"]);
  expect(onWord).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it("honors immediate while a sequence is already speaking", () => {
  const onWord = vi.fn();
  const onSpeakingChange = vi.fn();
  const props = { text: "Um dois três", skipLabel: "Mostrar tudo", onWord, onSpeakingChange };
  const { rerender } = render(<PaperSpeech {...props} />);
  advance(0);
  rerender(<PaperSpeech {...props} immediate />);
  expect(visible()).toEqual(["Um", "dois", "três"]);
  expect(onSpeakingChange).toHaveBeenLastCalledWith(false);
  expect(vi.getTimerCount()).toBe(0);
  advance(10000);
  expect(onWord).toHaveBeenCalledTimes(1);
});

it.each(["system", "app"])("shows everything initially with %s reduced motion", (source) => {
  if (source === "system") systemReduce = true;
  else document.documentElement.dataset["reduceMotion"] = "true";
  const onWord = vi.fn();
  const onSpeakingChange = vi.fn();
  render(
    <PaperSpeech
      text="Sem movimento"
      skipLabel="Mostrar tudo"
      onWord={onWord}
      onSpeakingChange={onSpeakingChange}
    />,
  );
  expect(visible()).toEqual(["Sem", "movimento"]);
  expect(onSpeakingChange.mock.calls).toEqual([[false]]);
  expect(onWord).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it.each(["system", "app"])(
  "finishes on a live %s reduced motion change without replay",
  async (source) => {
    const onWord = vi.fn();
    const onSpeakingChange = vi.fn();
    render(
      <PaperSpeech
        text="Um dois três"
        skipLabel="Mostrar tudo"
        onWord={onWord}
        onSpeakingChange={onSpeakingChange}
      />,
    );
    advance(0);
    await act(async () => {
      if (source === "system") {
        systemReduce = true;
        media.dispatchEvent(new Event("change"));
      } else document.documentElement.dataset["reduceMotion"] = "true";
    });
    expect(visible()).toEqual(["Um", "dois", "três"]);
    expect(onSpeakingChange).toHaveBeenLastCalledWith(false);
    await act(async () => {
      systemReduce = false;
      delete document.documentElement.dataset["reduceMotion"];
      media.dispatchEvent(new Event("change"));
    });
    advance(10000);
    expect(onWord).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  },
);

it("pauses in a hidden tab and resumes the remaining dwell without catching up", () => {
  const onWord = vi.fn();
  const onSpeakingChange = vi.fn();
  render(
    <PaperSpeech
      text="Um dois três"
      skipLabel="Mostrar tudo"
      onWord={onWord}
      onSpeakingChange={onSpeakingChange}
    />,
  );
  advance(0);
  const dwell = onWord.mock.calls[0]![0].durationMs;
  advance(100);
  hidden(true);
  expect(document.querySelector(".paper-speech")?.getAttribute("data-paused")).toBe("true");
  expect(onSpeakingChange).toHaveBeenLastCalledWith(false);
  expect(vi.getTimerCount()).toBe(0);
  advance(60000);
  expect(visible()).toEqual(["Um"]);
  hidden(false);
  advance(dwell - 101);
  expect(visible()).toEqual(["Um"]);
  advance(1);
  expect(visible()).toEqual(["Um", "dois"]);
  expect(onSpeakingChange.mock.calls).toEqual([[true], [false], [true]]);
});

it("does not start in a hidden tab and can still skip while hidden", () => {
  hidden(true);
  const onWord = vi.fn();
  const onSpeakingChange = vi.fn();
  render(
    <PaperSpeech
      text="Um dois"
      skipLabel="Mostrar tudo"
      onWord={onWord}
      onSpeakingChange={onSpeakingChange}
    />,
  );
  advance(60000);
  expect(onWord).not.toHaveBeenCalled();
  expect(onSpeakingChange.mock.calls).toEqual([[false]]);
  fireEvent.click(screen.getByRole("button", { name: "Mostrar tudo" }));
  hidden(false);
  advance(10000);
  expect(visible()).toEqual(["Um", "dois"]);
  expect(onWord).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it("resets on new text, cleans up on unmount and never duplicates words in StrictMode", () => {
  const onWord = vi.fn();
  const onSpeakingChange = vi.fn();
  const props = { skipLabel: "Mostrar tudo", onWord, onSpeakingChange };
  const { rerender, unmount } = render(
    <StrictMode>
      <PaperSpeech {...props} text="Antigo texto" />
    </StrictMode>,
  );
  advance(0);
  expect(onWord).toHaveBeenCalledTimes(1);
  rerender(
    <StrictMode>
      <PaperSpeech {...props} text="Novo trecho" />
    </StrictMode>,
  );
  expect(visible()).toEqual([]);
  advance(0);
  expect(onWord.mock.calls.map(([event]) => [event.index, event.word])).toEqual([
    [0, "Antigo"],
    [0, "Novo"],
  ]);
  unmount();
  expect(onSpeakingChange).toHaveBeenLastCalledWith(false);
  expect(vi.getTimerCount()).toBe(0);
  hidden(true);
  hidden(false);
  act(() => media.dispatchEvent(new Event("change")));
  advance(10000);
  expect(onWord).toHaveBeenCalledTimes(2);
});

it("handles empty or whitespace-only text without speaking or timers", () => {
  const onWord = vi.fn();
  const onSpeakingChange = vi.fn();
  const props = { skipLabel: "Mostrar tudo", onWord, onSpeakingChange };
  const { rerender } = render(<PaperSpeech {...props} text="" />);
  rerender(<PaperSpeech {...props} text={" \n "} />);
  expect(onSpeakingChange.mock.calls).toEqual([[false], [false]]);
  expect(onWord).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
