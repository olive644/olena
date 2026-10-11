import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HelenaChat as HelenaChatPreview } from "./helena-chat";
import { demonstrationReply } from "../data/helena-preview";
const { ask, account } = vi.hoisted(() => ({ ask: vi.fn(), account: vi.fn() }));
vi.mock("../data/helena-client", async (original) => ({
  ...(await original<typeof import("../data/helena-client")>()),
  requestHelena: ask,
}));
vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: account }));

beforeEach(() => {
  ask.mockReset();
  account.mockReset();
  vi.useFakeTimers();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  );
});

it("requires explicit consent before sending any content externally", () => {
  render(<HelenaChatPreview initiallyOpen />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Explique divisão" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
  expect(screen.getByRole("alert").textContent).toContain("Autorize");
  expect(ask).not.toHaveBeenCalled();
  expect(account).not.toHaveBeenCalled();
});

it("uses the authenticated teacher with screen context and no training retention", async () => {
  account.mockResolvedValue({ auth: { currentUser: { getIdToken: async () => "test-token" } } });
  ask.mockResolvedValue({ answer: "Dividir é formar grupos iguais." });
  render(<HelenaChatPreview initiallyOpen currentView="learn" />);
  fireEvent.click(screen.getByRole("checkbox"));
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
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Explique divisão" } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" })));
  expect(screen.getByRole("alert").textContent).not.toContain("server secret");
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Explique divisão");
  expect(screen.queryByText(/Pode me contar um pouco mais/)).toBeNull();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("opens from the paper star and restores launcher focus with Escape", () => {
  render(<HelenaChatPreview />);
  const launcher = screen.getByRole("button", { name: "Conversar com Helena" });
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(launcher);
  expect(screen.getByRole("dialog", { name: "Helena" })).toBeTruthy();
  expect(screen.getByRole("textbox")).toBe(document.activeElement);
  expect(document.querySelector(".helena-chat-launcher .room-points-icon")).toBeTruthy();
  expect(document.querySelector(".helena-virtual-mascot")).toBeNull();
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
