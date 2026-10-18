import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SignOutButton } from "./sign-out-button";

it("só sai após confirmação e Cancelar restaura o foco", async () => {
  const signOut = vi.fn().mockResolvedValue(undefined);
  render(<SignOutButton onSignOut={signOut} />);
  const opener = screen.getByRole("button", { name: "Sair desta conta" });
  fireEvent.click(opener);
  expect(signOut).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").parentElement).toBe(document.body);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(opener);
  fireEvent.click(opener);
  fireEvent.click(screen.getByRole("button", { name: /^Sair$/ }));
  await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
});
it("permite tentar sincronizar e sair mesmo com estado pendente", async () => {
  const signOut = vi.fn().mockResolvedValue(undefined);
  render(<SignOutButton onSignOut={signOut} blocked />);
  fireEvent.click(screen.getByRole("button", { name: "Sair desta conta" }));
  fireEvent.click(screen.getByRole("button", { name: /^Sair$/ }));
  await waitFor(() => expect(signOut).toHaveBeenCalledWith(false));
});
it("só descarta pendências após falha e confirmação explícita", async () => {
  const signOut = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
  render(<SignOutButton onSignOut={signOut} blocked />);
  fireEvent.click(screen.getByRole("button", { name: "Sair desta conta" }));
  expect(screen.queryByRole("checkbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /^Sair$/ }));
  const discard = await screen.findByRole("checkbox");
  fireEvent.click(discard);
  fireEvent.click(screen.getByRole("button", { name: /^Sair$/ }));
  await waitFor(() => expect(signOut).toHaveBeenLastCalledWith(true));
});
it("falha na saída mantém confirmação aberta e mostra erro", async () => {
  const signOut = vi.fn().mockRejectedValue(new Error("offline"));
  render(<SignOutButton onSignOut={signOut} />);
  fireEvent.click(screen.getByRole("button", { name: "Sair desta conta" }));
  fireEvent.click(screen.getByRole("button", { name: /^Sair$/ }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByRole("dialog")).toBeTruthy();
});
