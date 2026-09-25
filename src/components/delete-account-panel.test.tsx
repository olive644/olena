import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountDeletionError } from "../data/account-deletion";
import { DeleteAccountPanel } from "./delete-account-panel";

afterEach(cleanup);

const CONFIRM = "Excluir esta conta para sempre";

function open(onDelete: () => Promise<void> = vi.fn(async () => undefined)) {
  render(<DeleteAccountPanel accountName="Helena Ferreira" onDelete={onDelete} />);
  fireEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));
  return { onDelete, input: screen.getByLabelText(/Para confirmar, digite/) as HTMLInputElement };
}

describe("exclusão de conta no perfil", () => {
  it("começa fechada: só o botão da zona de perigo aparece", () => {
    render(<DeleteAccountPanel accountName="Helena" onDelete={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Excluir esta conta" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a janela lista o que será apagado e o botão final começa bloqueado", () => {
    open();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.textContent).toContain("Helena Ferreira");
    expect(dialog.textContent).toContain("nuvem");
    expect((screen.getByRole("button", { name: CONFIRM }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("só libera com o nome exato, com maiúsculas e minúsculas", () => {
    const { input } = open();
    const confirm = screen.getByRole("button", { name: CONFIRM }) as HTMLButtonElement;
    fireEvent.change(input, { target: { value: "helena ferreira" } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(input, { target: { value: "Helena Ferreira" } });
    expect(confirm.disabled).toBe(false);
  });

  it("não exclui sem o nome, nem por Enter", () => {
    const onDelete = vi.fn(async () => undefined);
    const { input } = open(onDelete);
    fireEvent.change(input, { target: { value: "Helena" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("com o nome digitado, exclui uma vez e mostra o andamento", () => {
    let finish: () => void = () => undefined;
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { input } = open(onDelete);
    fireEvent.change(input, { target: { value: "Helena Ferreira" } });
    const confirm = screen.getByRole("button", { name: CONFIRM });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Excluindo…" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    finish();
  });

  it("explica quando o login do Google foi fechado e quando a exclusão falhou", async () => {
    const onDelete = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new AccountDeletionError("cancelled"))
      .mockRejectedValueOnce(new AccountDeletionError("failed"));
    const { input } = open(onDelete);
    fireEvent.change(input, { target: { value: "Helena Ferreira" } });
    fireEvent.click(screen.getByRole("button", { name: CONFIRM }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("login foi fechado"),
    );
    fireEvent.click(screen.getByRole("button", { name: CONFIRM }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Não foi possível concluir"),
    );
  });

  it("Escape e Cancelar fecham a janela sem excluir e devolvem o foco ao botão", () => {
    const onDelete = vi.fn(async () => undefined);
    const { input } = open(onDelete);
    fireEvent.change(input, { target: { value: "Helena Ferreira" } });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    const opener = screen.getByRole("button", { name: "Excluir minha conta" });
    expect(document.activeElement).toBe(opener);
    fireEvent.click(opener);
    expect((screen.getByLabelText(/Para confirmar, digite/) as HTMLInputElement).value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
