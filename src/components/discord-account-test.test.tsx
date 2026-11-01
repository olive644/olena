import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { DiscordAccountTest } from "./discord-account-test";
const state = vi.hoisted(() => ({
  owner: true,
  auth: {
    currentUser: null as {
      uid: string;
      isAnonymous: boolean;
      getIdToken: () => Promise<string>;
    } | null,
  },
}));
vi.mock("../hooks/use-profile-handle", () => ({
  useProfileHandle: () => ({ handle: { creks: state.owner } }),
}));
vi.mock("../data/firebase-account", () => ({
  getFirebaseAccountServices: async () => ({ auth: state.auth }),
}));
beforeEach(() => {
  state.owner = true;
  state.auth.currentUser = {
    uid: "owner",
    isAnonymous: false,
    getIdToken: async () => "test-token",
  };
});

it("fica oculto para contas comuns e não envia nada ao montar", () => {
  state.owner = false;
  render(<DiscordAccountTest />);
  expect(screen.queryByRole("button")).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});
it("clique explícito envia um teste, impede duplicação e mostra ID confirmado", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ messageId: "1562664759017340999" }));
  render(<DiscordAccountTest />);
  const button = screen.getByRole("button", { name: "Enviar mensagem de teste" });
  fireEvent.click(button);
  fireEvent.click(button);
  await screen.findByText("Teste enviado ao ACCOUNT.");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/1562664759017340999/)).toBeTruthy();
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(fetch).toHaveBeenCalledWith(
    "/api/olena?action=account-log-test",
    expect.objectContaining({ body: '{"confirm":true}' }),
  );
});
it("mostra causa e local seguros em vez de fingir envio", async () => {
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ error: "discord-log-bot-access", target: "channel" }, { status: 503 }),
  );
  render(<DiscordAccountTest />);
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(/Permita Ver canal.*Local: canal ACCOUNT/);
  expect(screen.queryByText("Teste enviado ao ACCOUNT.")).toBeNull();
});
it("não apresenta resultado de outra conta após troca de sessão", async () => {
  let resolve!: (response: Response) => void;
  vi.mocked(fetch).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  render(<DiscordAccountTest />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  state.auth.currentUser = {
    uid: "other",
    isAnonymous: false,
    getIdToken: async () => "other-token",
  };
  await act(async () => {
    resolve(Response.json({ messageId: "1562664759017340999" }));
  });
  expect(screen.queryByText(/1562664759017340999/)).toBeNull();
});
