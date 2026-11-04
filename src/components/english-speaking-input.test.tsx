import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EnglishSpeakingInput } from "./english-speaking-input";
import { LocalEnglishSpeech } from "../data/english-local-speech";
import { VOICE_FILES, VOICE_MODEL, VOICE_REVISION } from "../data/english-asr-model";
let speech: LocalEnglishSpeech;
const answer = vi.fn(),
  alternative = vi.fn(),
  pause = vi.fn(),
  allow = vi.fn();
function mount(allowed = false) {
  return render(
    <EnglishSpeakingInput
      speech={speech}
      expected="What is your name?"
      allowed={allowed}
      disabled={false}
      onAllow={allow}
      onPause={pause}
      onAnswer={answer}
      onAlternative={alternative}
      onSound={() => undefined}
    />,
  );
}
async function prepare() {
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Preparar voz no aparelho" }));
  await screen.findByRole("button", { name: "Falar agora" });
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("AudioContext", class {});
  vi.stubGlobal("AudioWorkletNode", class {});
  vi.stubGlobal("Worker", class {});
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });
  speech = new LocalEnglishSpeech();
  vi.spyOn(speech, "load").mockImplementation(async () => {
    speech.ready = true;
    return "";
  });
  vi.spyOn(speech, "start").mockResolvedValue();
  vi.spyOn(speech, "partial").mockResolvedValue(undefined);
  vi.spyOn(speech, "subscribeSilence").mockReturnValue(() => undefined);
  vi.spyOn(speech, "finish").mockResolvedValue("What is your name?");
  vi.spyOn(speech, "cancel").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("requires consent and download then accepts a matching sentence automatically", async () => {
  mount();
  expect(
    screen.getByRole("button", { name: "Preparar voz no aparelho" }).hasAttribute("disabled"),
  ).toBe(true);
  expect(speech.load).not.toHaveBeenCalled();
  expect(speech.start).not.toHaveBeenCalled();
  await prepare();
  expect(speech.load).toHaveBeenCalledOnce();
  expect(speech.start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  await screen.findByRole("button", { name: "Terminar fala" });
  await waitFor(() => expect(pause).toHaveBeenLastCalledWith(false));
  fireEvent.click(screen.getByRole("button", { name: "Terminar fala" }));
  await waitFor(() => expect(answer).toHaveBeenCalled());
  expect(screen.queryByRole("button", { name: "Enviar resposta" })).toBeNull();
  expect(answer).toHaveBeenCalledWith("What is your name?");
});
it("load failure keeps the clock paused and allows equivalent words", async () => {
  vi.mocked(speech.load).mockRejectedValue(new Error("offline"));
  mount();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Preparar voz no aparelho" }));
  await screen.findByRole("alert");
  expect(pause).toHaveBeenLastCalledWith(true);
  expect(answer).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Agora não posso falar" }));
  expect(alternative).toHaveBeenCalledOnce();
});
it("denied microphone permission never grades a response", async () => {
  vi.mocked(speech.start).mockRejectedValue(new DOMException("denied", "NotAllowedError"));
  mount();
  await prepare();
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toContain("não foi autorizado");
  expect(answer).not.toHaveBeenCalled();
});
it("processing pauses the clock and a mismatch asks for a retry without grading", async () => {
  let finish: ((value: string) => void) | undefined;
  vi.mocked(speech.finish).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  mount();
  await prepare();
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  await screen.findByRole("button", { name: "Terminar fala" });
  fireEvent.click(screen.getByRole("button", { name: "Terminar fala" }));
  await waitFor(() => expect(pause).toHaveBeenLastCalledWith(true));
  await act(async () => finish?.("My name is Olena."));
  expect(answer).not.toHaveBeenCalled();
  expect(
    screen.getByText(
      "As palavras em vermelho precisam de outra tentativa. Fale a frase novamente.",
    ),
  ).toBeTruthy();
  expect(pause).toHaveBeenLastCalledWith(true);
});
it("unmount cancels capture and ignores late microphone resolution", async () => {
  let start: (() => void) | undefined;
  vi.mocked(speech.start).mockImplementation(
    () =>
      new Promise((resolve) => {
        start = resolve;
      }),
  );
  const view = mount();
  await prepare();
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  view.unmount();
  await act(async () => start?.());
  expect(speech.cancel).toHaveBeenCalled();
  expect(answer).not.toHaveBeenCalled();
});
it("silence or local inference failure does not remove hearts by submitting an answer", async () => {
  vi.mocked(speech.finish).mockRejectedValue(new Error("no-speech"));
  mount();
  await prepare();
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  await screen.findByRole("button", { name: "Terminar fala" });
  fireEvent.click(screen.getByRole("button", { name: "Terminar fala" }));
  await screen.findByRole("alert");
  expect(answer).not.toHaveBeenCalled();
  expect(pause).toHaveBeenLastCalledWith(true);
});
it("reuses prepared model without another download", async () => {
  speech.ready = true;
  mount(true);
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  await screen.findByRole("button", { name: "Terminar fala" });
  expect(speech.load).not.toHaveBeenCalled();
});
it("unsupported audio APIs offer words without loading any model", () => {
  vi.stubGlobal("AudioWorkletNode", undefined);
  mount();
  expect(screen.queryByRole("button", { name: "Preparar voz no aparelho" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Agora não posso falar" }));
  expect(alternative).toHaveBeenCalledOnce();
  expect(speech.load).not.toHaveBeenCalled();
});

it("stops recording after twelve seconds and accepts a matching sentence", async () => {
  mount();
  await prepare();
  vi.useFakeTimers();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  });
  expect(screen.getByRole("button", { name: "Terminar fala" })).toBeDefined();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(12000);
  });
  expect(speech.finish).toHaveBeenCalledOnce();
  expect(answer).toHaveBeenCalledWith("What is your name?");
});
it("discards late inference after leaving the activity", async () => {
  let resolve: ((value: string) => void) | undefined;
  vi.mocked(speech.finish).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const view = mount();
  await prepare();
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  await screen.findByRole("button", { name: "Terminar fala" });
  fireEvent.click(screen.getByRole("button", { name: "Terminar fala" }));
  view.unmount();
  await act(async () => resolve!("private recording"));
  expect(answer).not.toHaveBeenCalled();
  expect(speech.cancel).toHaveBeenCalled();
});

it("colors a recognized prefix while listening and only accepts after the speech ends", async () => {
  let end: (() => void) | undefined;
  vi.mocked(speech.subscribeSilence).mockImplementation((listener) => {
    end = listener;
    return () => undefined;
  });
  vi.mocked(speech.partial).mockResolvedValue("What is");
  const view = mount();
  await prepare();
  vi.useFakeTimers();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(view.container.querySelectorAll('[data-word-state="correct"]')).toHaveLength(2);
  expect(view.container.querySelectorAll('[data-word-state="waiting"]')).toHaveLength(2);
  expect(answer).not.toHaveBeenCalled();
  await act(async () => end!());
  expect(answer).toHaveBeenCalledExactlyOnceWith("What is your name?");
  expect(screen.queryByRole("button", { name: "Enviar resposta" })).toBeNull();
});

const REMEMBERED = "olena.englishVoice.prepared.v1";
function cacheWith(files: readonly string[]) {
  const urls = files.map(
    (f) => `https://huggingface.co/${VOICE_MODEL}/resolve/${VOICE_REVISION}/onnx/${f}`,
  );
  vi.stubGlobal("caches", {
    open: async () => ({
      match: async (url: string) => (urls.includes(url) ? new Response("peso") : undefined),
    }),
  });
}
it("remembers on this device that the voice was prepared, so the next practice does not ask again", async () => {
  mount();
  expect(localStorage.getItem(REMEMBERED)).toBeNull();
  await prepare();
  expect(localStorage.getItem(REMEMBERED)).toBe(VOICE_REVISION);
});
it("prepares the cached voice by itself and never asks for the download again", async () => {
  localStorage.setItem(REMEMBERED, VOICE_REVISION);
  cacheWith(VOICE_FILES);
  mount();
  expect(screen.queryByText(/Baixe o modelo gratuito/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Preparar voz no aparelho" })).toBeNull();
  await screen.findByRole("button", { name: "Falar agora" });
  expect(speech.load).toHaveBeenCalledOnce();
  expect(speech.start).not.toHaveBeenCalled();
  // O microfone é pedido só no início da partida: a atividade não repete nenhum pedido.
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(screen.getByRole("button", { name: "Falar agora" }).hasAttribute("disabled")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  await screen.findByRole("button", { name: "Terminar fala" });
});
it("goes back to the consent and download when the browser erased the model", async () => {
  localStorage.setItem(REMEMBERED, VOICE_REVISION);
  cacheWith([VOICE_FILES[0]]);
  mount();
  await screen.findByRole("button", { name: "Preparar voz no aparelho" });
  expect(speech.load).not.toHaveBeenCalled();
  expect(localStorage.getItem(REMEMBERED)).toBeNull();
  expect(screen.queryByText(/Baixe o modelo gratuito/)).toBeNull();
  expect(screen.getByRole("checkbox").closest("label")?.textContent).toContain("baixar o modelo");
});
it("ignores a marker from another model revision", async () => {
  localStorage.setItem(REMEMBERED, "revisao-antiga");
  cacheWith(VOICE_FILES);
  mount();
  expect(screen.getByRole("button", { name: "Preparar voz no aparelho" })).toBeTruthy();
  expect(speech.load).not.toHaveBeenCalled();
});

it("shows streamed words during inference without accepting a provisional sentence", async () => {
  let streamed: ((text: string) => void) | undefined;
  vi.spyOn(speech, "subscribeTranscript").mockImplementation((listener) => {
    streamed = listener;
    return () => undefined;
  });
  let finish: ((text: string) => void) | undefined;
  vi.mocked(speech.finish).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = mount();
  await prepare();
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  await screen.findByRole("button", { name: "Terminar fala" });
  await act(async () => streamed!("What is"));
  await act(async () => streamed!("What"));
  expect(view.container.querySelectorAll('[data-word-state="correct"]')).toHaveLength(2);
  expect(answer).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Terminar fala" }));
  await act(async () => streamed!("What is your name?"));
  expect(answer).not.toHaveBeenCalled();
  await act(async () => finish!("What is your name?"));
  expect(answer).toHaveBeenCalledExactlyOnceWith("What is your name?");
});

it("never shows a microphone checkbox once the voice is loaded, even without a grant flag", async () => {
  speech.ready = true;
  render(
    <EnglishSpeakingInput
      speech={speech}
      expected="What is your name?"
      allowed={false}
      disabled={false}
      onAllow={allow}
      onPause={pause}
      onAnswer={answer}
      onAlternative={alternative}
      onSound={() => undefined}
    />,
  );
  expect(screen.queryByRole("checkbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  await screen.findByRole("button", { name: "Terminar fala" });
  expect(speech.load).not.toHaveBeenCalled();
});
it("keeps refreshing the live words back to back while the person speaks", async () => {
  let calls = 0;
  vi.mocked(speech.partial).mockImplementation(async () => {
    calls++;
    return "What is";
  });
  mount();
  await prepare();
  vi.useFakeTimers();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Falar agora" }));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(calls).toBeGreaterThanOrEqual(4);
});

const record = () => screen.getByRole("button", { name: /Falar agora|Terminar fala/ });
it("records while the button is held and finishes when it is released", async () => {
  mount();
  await prepare();
  vi.useFakeTimers({ toFake: ["Date"] });
  fireEvent.pointerDown(record());
  await screen.findByRole("button", { name: "Terminar fala" });
  expect(speech.start).toHaveBeenCalledOnce();
  expect(screen.getByRole("status").textContent).toContain("Solte o botão para terminar");
  vi.setSystemTime(Date.now() + 1500);
  fireEvent.pointerUp(record());
  await waitFor(() => expect(answer).toHaveBeenCalledWith("What is your name?"));
  expect(speech.finish).toHaveBeenCalledOnce();
});
it("a quick tap keeps listening until the next tap", async () => {
  mount();
  await prepare();
  fireEvent.pointerDown(record());
  await screen.findByRole("button", { name: "Terminar fala" });
  fireEvent.pointerUp(record());
  fireEvent.click(record(), { detail: 1 });
  expect(speech.finish).not.toHaveBeenCalled();
  fireEvent.pointerDown(record());
  await waitFor(() => expect(answer).toHaveBeenCalled());
  expect(speech.finish).toHaveBeenCalledOnce();
});
it("pauses in the middle of the sentence do not end a held recording", async () => {
  let silence: (() => void) | undefined;
  vi.mocked(speech.subscribeSilence).mockImplementation((listener) => {
    silence = listener;
    return () => undefined;
  });
  mount();
  await prepare();
  vi.useFakeTimers({ toFake: ["Date"] });
  fireEvent.pointerDown(record());
  await screen.findByRole("button", { name: "Terminar fala" });
  await act(async () => silence!());
  expect(speech.finish).not.toHaveBeenCalled();
  vi.setSystemTime(Date.now() + 1500);
  fireEvent.pointerUp(record());
  await waitFor(() => expect(speech.finish).toHaveBeenCalledOnce());
});
it("releasing the button while the microphone is still opening finishes as soon as it listens", async () => {
  let opened: (() => void) | undefined;
  vi.mocked(speech.start).mockImplementation(
    () =>
      new Promise((resolve) => {
        opened = resolve;
      }),
  );
  mount();
  await prepare();
  vi.useFakeTimers({ toFake: ["Date"] });
  fireEvent.pointerDown(record());
  vi.setSystemTime(Date.now() + 1500);
  fireEvent.pointerUp(record());
  expect(speech.finish).not.toHaveBeenCalled();
  await act(async () => opened!());
  await waitFor(() => expect(speech.finish).toHaveBeenCalledOnce());
});
it("keeps keyboard activation as a toggle, and a pointer click never toggles twice", async () => {
  mount();
  await prepare();
  fireEvent.click(record(), { detail: 0 });
  await screen.findByRole("button", { name: "Terminar fala" });
  expect(speech.start).toHaveBeenCalledOnce();
  fireEvent.click(record(), { detail: 0 });
  await waitFor(() => expect(answer).toHaveBeenCalled());
  expect(speech.finish).toHaveBeenCalledOnce();
});
it("keeps the record button enabled while the microphone opens, so a finger on it still releases", async () => {
  let opened: (() => void) | undefined;
  vi.mocked(speech.start).mockImplementation(
    () =>
      new Promise((resolve) => {
        opened = resolve;
      }),
  );
  mount();
  await prepare();
  fireEvent.pointerDown(record());
  await screen.findByText("Aguardando o microfone…");
  expect(record().hasAttribute("disabled")).toBe(false);
  // Um clique de teclado durante a abertura não abre o microfone uma segunda vez.
  fireEvent.click(record(), { detail: 0 });
  expect(speech.start).toHaveBeenCalledOnce();
  await act(async () => opened!());
});
