import { afterEach, it, expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ArcanaShare } from "./arcana-share";
const mocks = vi.hoisted(() => ({ prepare: vi.fn(), url: vi.fn(), revoke: vi.fn() }));
vi.mock("../data/arcana-share-png", () => ({ arcanaSharePng: mocks.prepare }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mocks.prepare.mockReset();
  mocks.url.mockReset();
  mocks.revoke.mockReset();
});
const source = () => document.createElement("article");
it("informa o motivo acessível sem compartilhar cartas não obtidas", () => {
  render(<ArcanaShare id="major-17" owner="Teste" obtained={false} source={source} />);
  const button = screen.getByRole("button", { name: "Compartilhar carta, Ainda não obtida" });
  expect(button.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(button);
  expect(mocks.prepare).not.toHaveBeenCalled();
});
it("descarta resultado atrasado após cancelar sem criar URL ou reabrir o diálogo", async () => {
  let finish: ((file: File) => void) | undefined;
  mocks.prepare.mockImplementation(
    () =>
      new Promise<File>((resolve) => {
        finish = resolve;
      }),
  );
  vi.spyOn(URL, "createObjectURL").mockImplementation(mocks.url);
  render(<ArcanaShare id="major-17" owner="Teste" obtained source={source} />);
  fireEvent.click(screen.getByRole("button", { name: "Compartilhar carta" }));
  await waitFor(() => expect(mocks.prepare).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole("button", { name: "Voltar à carta" }));
  await act(async () => {
    finish!(new File(["png"], "carta.png", { type: "image/png" }));
  });
  expect(mocks.url).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("mostra falha de exportação e permite fechar sem oferecer arquivo inexistente", async () => {
  mocks.prepare.mockRejectedValue(new Error("offline"));
  render(<ArcanaShare id="major-17" owner="Teste" obtained source={source} />);
  fireEvent.click(screen.getByRole("button", { name: "Compartilhar carta" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Não foi possível preparar a imagem. Tente novamente.",
  );
  expect(screen.queryByRole("link", { name: "Salvar imagem" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Voltar à carta" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});
