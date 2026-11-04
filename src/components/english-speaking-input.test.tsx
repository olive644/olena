import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EnglishSpeakingInput } from "./english-speaking-input";
import type { VoiceRecognition } from "../data/english-speaking";
class Recognition implements VoiceRecognition {
  static last: Recognition;
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: VoiceRecognition["onstart"] = null;
  onspeechend: VoiceRecognition["onspeechend"] = null;
  onend: VoiceRecognition["onend"] = null;
  onerror: VoiceRecognition["onerror"] = null;
  onresult: VoiceRecognition["onresult"] = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    Recognition.last = this;
  }
}
const answer = vi.fn(),
  alternative = vi.fn(),
  pause = vi.fn(),
  allow = vi.fn();
function mount(allowed = false) {
  return render(
    <EnglishSpeakingInput
      allowed={allowed}
      disabled={false}
      onAnswer={answer}
      onAlternative={alternative}
      onAllow={allow}
      onPause={pause}
      onSound={() => undefined}
    />,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("SpeechRecognition", Recognition);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("requires explicit consent, displays recognized speech and submits only on confirmation", () => {
  const view = mount();
  expect(screen.getByRole("button", { name: "Falar agora" }).hasAttribute("disabled")).toBe(true);
  expect(allow).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  const r = Recognition.last;
  expect(r.start).toHaveBeenCalledOnce();
  expect(r.lang).toBe("en-GB");
  act(() => r.onstart?.());
  expect(pause).toHaveBeenLastCalledWith(false);
  act(() => {
    r.onresult?.({ results: [{ isFinal: true, 0: { transcript: "My name is Olena." } }] });
    r.onend?.();
  });
  expect(answer).not.toHaveBeenCalled();
  expect(screen.getByText("My name is Olena.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));
  expect(answer).toHaveBeenCalledWith("My name is Olena.");
  view.unmount();
  expect(r.abort).toHaveBeenCalled();
});
it("permission denial, silence and network errors never grade an answer", () => {
  mount(true);
  for (const error of ["not-allowed", "service-not-allowed", "no-speech", "network"]) {
    fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
    act(() => Recognition.last.onerror?.({ error }));
    expect(screen.getByRole("alert")).toBeTruthy();
    if (error === "service-not-allowed")
      expect(screen.getByRole("alert").textContent).not.toContain("não foi autorizado");
    expect(pause).toHaveBeenLastCalledWith(true);
  }
  expect(answer).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Agora não posso falar" }));
  expect(alternative).toHaveBeenCalledOnce();
});
it("aborts on dialog interruption and ignores callbacks after unmount", () => {
  const view = mount(true);
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  const r = Recognition.last,
    late = r.onresult;
  act(() => r.onstart?.());
  view.rerender(
    <EnglishSpeakingInput
      allowed
      disabled
      onAnswer={answer}
      onAlternative={alternative}
      onAllow={allow}
      onPause={pause}
      onSound={() => undefined}
    />,
  );
  expect(r.abort).toHaveBeenCalled();
  view.unmount();
  act(() => late?.({ results: [{ isFinal: true, 0: { transcript: "private late text" } }] }));
  expect(answer).not.toHaveBeenCalled();
});
it("caps recording and processing, with a recoverable timeout and no answer", async () => {
  vi.useFakeTimers();
  mount(true);
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  const r = Recognition.last;
  act(() => r.onstart?.());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(12000);
  });
  expect(r.stop).toHaveBeenCalledOnce();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(8000);
  });
  expect(r.abort).toHaveBeenCalled();
  expect(answer).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeTruthy();
});
it("unsupported browsers offer the same question without requesting a microphone", () => {
  vi.stubGlobal("SpeechRecognition", undefined);
  vi.stubGlobal("webkitSpeechRecognition", undefined);
  mount();
  expect(screen.queryByRole("button", { name: "Falar agora" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Agora não posso falar" }));
  expect(alternative).toHaveBeenCalledOnce();
  expect(allow).not.toHaveBeenCalled();
});
it("stops capture when the tab is hidden and never resumes it automatically", () => {
  mount(true);
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  const r = Recognition.last;
  act(() => r.onstart?.());
  const descriptor = Object.getOwnPropertyDescriptor(document, "hidden");
  Object.defineProperty(document, "hidden", { configurable: true, value: true });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(r.abort).toHaveBeenCalled();
  expect(pause).toHaveBeenLastCalledWith(true);
  expect(screen.getByRole("button", { name: "Falar agora" })).toBeTruthy();
  if (descriptor) Object.defineProperty(document, "hidden", descriptor);
  else Reflect.deleteProperty(document, "hidden");
  expect(r.start).toHaveBeenCalledOnce();
});
it("times out an unanswered permission request without submitting a failed attempt", async () => {
  vi.useFakeTimers();
  mount(true);
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20000);
  });
  expect(Recognition.last.abort).toHaveBeenCalled();
  expect(answer).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeTruthy();
});
it("pauses the game for automatic recognition processing and stops only once", () => {
  mount(true);
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  const r = Recognition.last;
  act(() => r.onstart?.());
  expect(pause).toHaveBeenLastCalledWith(false);
  act(() => {
    r.onspeechend?.();
    r.onspeechend?.();
  });
  expect(r.stop).toHaveBeenCalledOnce();
  expect(pause).toHaveBeenLastCalledWith(true);
  act(() => {
    r.onresult?.({ results: [{ isFinal: true, 0: { transcript: "What is your name?" } }] });
    r.onend?.();
  });
  expect(pause).toHaveBeenLastCalledWith(false);
  expect(screen.getByRole("button", { name: "Enviar resposta" })).toBeTruthy();
});
