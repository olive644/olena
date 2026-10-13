import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HelenaChat as HelenaChatPreview } from "./helena-chat";
import { HELENA_PLAN_DRAFT_EVENT } from "../domain/agenda";
import { demonstrationReply } from "../data/helena-preview";
const { ask, account } = vi.hoisted(() => ({ ask: vi.fn(), account: vi.fn() }));
vi.mock("../data/helena-client", async (original) => ({
  ...(await original<typeof import("../data/helena-client")>()),
  streamHelena: ask,
}));
vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: account }));

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  ask.mockReset();
  account.mockReset();
  vi.useFakeTimers();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  );
});
it("keeps the launcher accessible without a hover instruction balloon", () => {
  const view = render(<HelenaChatPreview currentView="planner" />);
  expect(view.container.querySelector(".helena-chat-hint")).toBeNull();
  expect(screen.getByRole("button", { name: /Helena/ })).toBeTruthy();
});

it("accepts a planning draft without contacting the provider and rejects oversized context", () => {
  render(<HelenaChatPreview currentView="planner" />);
  act(() =>
    window.dispatchEvent(
      new CustomEvent(HELENA_PLAN_DRAFT_EVENT, { detail: "Planeje sem alterar minha agenda." }),
    ),
  );
  expect(screen.getByRole("textbox").getAttribute("aria-label")).toBe("Escreva para a Helena");
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
    "Planeje sem alterar minha agenda.",
  );
  expect(ask).not.toHaveBeenCalled();
  expect(account).not.toHaveBeenCalled();
  act(() =>
    window.dispatchEvent(new CustomEvent(HELENA_PLAN_DRAFT_EVENT, { detail: "x".repeat(2001) })),
  );
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
    "Planeje sem alterar minha agenda.",
  );
});

it("removes the obsolete copy and does not send anything merely on opening", () => {
  render(<HelenaChatPreview initiallyOpen />);
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(screen.queryByText("Um passo de cada vez.")).toBeNull();
  expect(screen.queryByText("Mensagem para Helena")).toBeNull();
  expect(screen.queryByText(/Por onde começamos/)).toBeNull();
  expect(ask).not.toHaveBeenCalled();
  expect(account).not.toHaveBeenCalled();
});

it("uses the authenticated teacher with screen context and no training retention", async () => {
  account.mockResolvedValue({ auth: { currentUser: { getIdToken: async () => "test-token" } } });
  ask.mockImplementation(async (_request, options) => {
    options.onText("Dividir é formar grupos iguais.");
    return { answer: "Dividir é formar grupos iguais." };
  });
  render(<HelenaChatPreview initiallyOpen currentView="learn" />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Explique divisão" } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" })));
  expect(screen.getByText("Dividir é formar grupos iguais.")).toBeTruthy();
  expect(ask).toHaveBeenCalledWith(
    expect.objectContaining({
      prompt: "Explique divisão",
      privacy: { consent: true, retention: "none" },
      sources: [expect.objectContaining({ content: expect.stringContaining("learn") })],
    }),
    expect.objectContaining({ token: "test-token" }),
  );
});

it("shows service failure honestly and restores the draft", async () => {
  account.mockResolvedValue({ auth: { currentUser: { getIdToken: async () => "test-token" } } });
  ask.mockRejectedValue(new Error("server secret"));
  render(<HelenaChatPreview initiallyOpen />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Explique divisão" } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" })));
  expect(screen.getByRole("alert").textContent).not.toContain("server secret");
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Explique divisão");
  expect(screen.queryByText(/Pode me contar um pouco mais/)).toBeNull();
});

it("shows partial text immediately, stops upstream and ignores late text after a new send", async () => {
  account.mockResolvedValue({ auth: { currentUser: { getIdToken: async () => "test-token" } } });
  const turns: { signal: AbortSignal; onText(text: string): void; finish(): void }[] = [];
  ask.mockImplementation(
    (_request, options) =>
      new Promise<void>((resolve) => {
        turns.push({ ...options, finish: resolve });
      }),
  );
  render(<HelenaChatPreview initiallyOpen />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Primeira" } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" })));
  act(() => turns[0]!.onText("Começando a explicar"));
  expect(screen.getByText("Começando a explicar")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Interromper resposta" }));
  expect(turns[0]!.signal.aborted).toBe(true);
  expect(screen.getByText("Resposta interrompida")).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Segunda" } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" })));
  await act(async () => {
    turns[0]!.onText("stale overwrite");
    turns[0]!.finish();
  });
  expect(screen.queryByText("stale overwrite")).toBeNull();
  expect(screen.getByRole("button", { name: "Interromper resposta" })).toBeTruthy();
  await act(async () => {
    turns[1]!.onText("Nova resposta");
    turns[1]!.finish();
  });
  expect(screen.getByText("Nova resposta")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Interromper resposta" })).toBeNull();
});

it("interrupts on closing without deleting the partial conversation", async () => {
  account.mockResolvedValue({ auth: { currentUser: { getIdToken: async () => "test-token" } } });
  const abort = vi.fn();
  ask.mockImplementation(async (_request, options) => {
    options.onText("Texto parcial");
    await new Promise<void>((resolve) =>
      options.signal.addEventListener("abort", () => {
        abort();
        resolve();
      }),
    );
  });
  render(<HelenaChatPreview initiallyOpen />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Pergunta" } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" })));
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: /^Recolher conversa$/ })),
  );
  expect(abort).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Conversar com Helena" }));
  expect(screen.getByText("Texto parcial")).toBeTruthy();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("opens from the animated mascot and restores launcher focus with Escape", () => {
  render(<HelenaChatPreview />);
  const launcher = screen.getByRole("button", { name: "Conversar com Helena" });
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(launcher);
  expect(screen.getByRole("dialog", { name: "Helena" })).toBeTruthy();
  expect(screen.getByRole("textbox")).toBe(document.activeElement);
  expect(document.querySelectorAll(".helena-virtual-mascot")).toHaveLength(1);
  expect(document.querySelector(".helena-chat-welcome-art")).toBeNull();
  expect(document.querySelector(".helena-chat-header-mascot img")).toBeNull();
  expect(document.querySelector(".helena-virtual-mascot img")?.getAttribute("src")).toBe(
    "/helena-assistant/helena.png",
  );
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(launcher).toBe(document.activeElement);
});

it("finishes the closing animation before unmounting the chat", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: query === "(min-width: 900px)" })),
  );
  render(<HelenaChatPreview initiallyOpen preview />);
  fireEvent.click(screen.getByRole("button", { name: /^Recolher conversa$/ }));
  expect(screen.getByRole("dialog").classList.contains("is-closing")).toBe(true);
  act(() => vi.advanceTimersByTime(219));
  expect(screen.getByRole("dialog")).toBeTruthy();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Conversar com Helena" })).toBe(document.activeElement);
});

it("captures a touch drag, animates it and suppresses the release click", () => {
  render(<HelenaChatPreview />);
  const star = screen.getByRole("button", { name: "Conversar com Helena" });
  Object.assign(star, {
    setPointerCapture: vi.fn(),
    hasPointerCapture: () => true,
    releasePointerCapture: vi.fn(),
  });
  function pointer(type: string, x: number, y: number) {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, {
      pointerId: 4,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      clientX: x,
      clientY: y,
    });
    fireEvent(star, event);
  }
  pointer("pointerdown", 900, 600);
  pointer("pointermove", 70, 200);
  expect(document.querySelector(".helena-chat")?.getAttribute("data-motion")).toBe("dragging");
  pointer("pointerup", 70, 200);
  fireEvent.click(star, { detail: 1 });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.querySelector(".helena-chat")?.getAttribute("data-edge")).toBe("left");
  fireEvent.click(star, { detail: 0 });
  expect(screen.getByRole("dialog")).toBeTruthy();
});
it("sends a local demonstration, locks duplicates and preserves history when minimized", async () => {
  const network = vi.fn();
  vi.stubGlobal("fetch", network);
  render(<HelenaChatPreview initiallyOpen preview previewReply={demonstrationReply} />);
  fireEvent.click(screen.getByRole("button", { name: "Organizar meus estudos" }));
  expect(screen.getByRole("status").textContent).toContain("Helena está respondendo");
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "segunda mensagem" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(screen.getByRole("log").textContent).not.toContain("segunda mensagem");
  await act(async () => {
    vi.advanceTimersByTime(800);
  });
  expect(screen.getByText(/Qual matéria você quer estudar/)).toBeTruthy();
  expect(network).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /^Recolher conversa$/ }));
  fireEvent.click(screen.getByRole("button", { name: "Conversar com Helena" }));
  expect(screen.getByText("Organizar meus estudos")).toBeTruthy();
});
it("does not send blank text and lets Shift Enter insert a line break", () => {
  render(<HelenaChatPreview initiallyOpen preview />);
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "   " } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(screen.queryByRole("log")).toBeNull();
  fireEvent.change(input, { target: { value: "Quero revisar" } });
  fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
  expect(screen.queryByRole("log")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
  expect(screen.getByText("Quero revisar")).toBeTruthy();
});
it("does not autofocus and summon the keyboard on mobile", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false })),
  );
  render(<HelenaChatPreview initiallyOpen />);
  expect(screen.getByRole("textbox")).not.toBe(document.activeElement);
});
