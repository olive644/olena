import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SupportChat } from "./support-chat";
import type { SupportFeed } from "../domain/support";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  authChanged: undefined as undefined | ((user: { uid: string } | null) => void),
}));
vi.mock("../data/support", () => ({ requestSupport: mocks.request }));
vi.mock("../data/firebase-account", () => ({
  getFirebaseAccountServices: async () => ({
    auth: { currentUser: { uid: "alice" } },
    authApi: {
      onAuthStateChanged: (_auth: unknown, callback: (user: { uid: string } | null) => void) => {
        mocks.authChanged = callback;
        return () => {
          mocks.authChanged = undefined;
        };
      },
    },
  }),
}));
const ticketId = "a".repeat(64);
const feed: SupportFeed = {
  staff: false,
  ticket: {
    id: ticketId,
    updatedAt: 1,
    messages: [{ id: "one", text: "Mensagem privada", at: 1, from: "user" }],
  },
};
beforeEach(() => {
  mocks.request.mockReset();
  mocks.request.mockResolvedValue(feed);
});
it("renders messages as text and keeps the draft after a failed send", async () => {
  render(<SupportChat />);
  expect(await screen.findByText("Mensagem privada")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Sua mensagem"), { target: { value: "<img src=x>" } });
  mocks.request.mockRejectedValueOnce(new Error("Sem conexão"));
  fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Sem conexão");
  expect((screen.getByLabelText("Sua mensagem") as HTMLTextAreaElement).value).toBe("<img src=x>");
});
it("clears the private conversation immediately on account change", async () => {
  render(<SupportChat />);
  await screen.findByText("Mensagem privada");
  await waitFor(() => expect(mocks.authChanged).toBeTypeOf("function"));
  mocks.request.mockReturnValue(new Promise<SupportFeed>(() => {}));
  act(() => mocks.authChanged?.({ uid: "bob" }));
  expect(screen.queryByText("Mensagem privada")).toBeNull();
  expect(screen.queryByLabelText("Sua mensagem")).toBeNull();
});

it("does not let an older refresh erase a just-sent message", async () => {
  render(<SupportChat />);
  await screen.findByText("Mensagem privada");
  let resolveRefresh: ((value: SupportFeed) => void) | undefined;
  mocks.request.mockImplementationOnce(
    () =>
      new Promise<SupportFeed>((resolve) => {
        resolveRefresh = resolve;
      }),
  );
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await waitFor(() => expect(resolveRefresh).toBeTypeOf("function"));
  mocks.request.mockResolvedValueOnce({
    ...feed,
    ticket: {
      ...feed.ticket!,
      messages: [
        ...feed.ticket!.messages,
        { id: "two", text: "Nova mensagem", at: 2, from: "user" },
      ],
    },
  });
  fireEvent.change(screen.getByLabelText("Sua mensagem"), { target: { value: "Nova mensagem" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
  await screen.findByText("Nova mensagem");
  await act(async () => {
    resolveRefresh?.(feed);
  });
  expect(screen.getByText("Nova mensagem")).toBeTruthy();
});
