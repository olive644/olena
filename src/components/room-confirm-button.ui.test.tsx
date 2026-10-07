import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RoomConfirmButton } from "./room-confirm-button";
import { RoomExpiryNotice } from "./room-expiry-notice";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => {
  vi.useRealTimers();
});

function renderButton(props: { needsConfirmation?: boolean; onConfirm: () => void }) {
  render(
    <RoomConfirmButton
      title="Encerrar?"
      warning="Isso não pode ser desfeito."
      confirmLabel="Encerrar mesmo"
      {...props}
    >
      Encerrar sala
    </RoomConfirmButton>,
  );
}

it("age no primeiro toque quando não precisa de confirmação", () => {
  const onConfirm = vi.fn();
  renderButton({ needsConfirmation: false, onConfirm });
  fireEvent.click(screen.getByRole("button", { name: "Encerrar sala" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("descreve o aviso no diálogo e só executa uma vez ao confirmar", () => {
  const onConfirm = vi.fn();
  renderButton({ onConfirm });
  fireEvent.click(screen.getByRole("button", { name: "Encerrar sala" }));
  const dialog = screen.getByRole("dialog", { name: "Encerrar?" });
  expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Encerrar mesmo" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("o Tab fica preso entre Cancelar e confirmar", () => {
  renderButton({ onConfirm: vi.fn() });
  fireEvent.click(screen.getByRole("button", { name: "Encerrar sala" }));
  const cancel = screen.getByRole("button", { name: "Cancelar" });
  const confirm = screen.getByRole("button", { name: "Encerrar mesmo" });
  expect(document.activeElement).toBe(cancel);
  fireEvent.keyDown(cancel, { key: "Tab" });
  expect(document.activeElement).toBe(confirm);
  fireEvent.keyDown(confirm, { key: "Tab" });
  expect(document.activeElement).toBe(cancel);
});

it("o aviso de expiração muda de faixa conforme o tempo passa e some quando a sala acaba", () => {
  vi.useFakeTimers();
  const start = Date.now();
  const expiresAt = start + 10 * 60_000;
  render(<RoomExpiryNotice expiresAt={expiresAt} now={() => Date.now()} />);
  expect(screen.getByRole("status").textContent).toContain("menos de 10 minutos");
  act(() => {
    vi.advanceTimersByTime(6 * 60_000);
  });
  expect(screen.getByRole("status").textContent).toContain("menos de 5 minutos");
  act(() => {
    vi.advanceTimersByTime(4 * 60_000);
  });
  expect(screen.queryByRole("status")).toBeNull();
});
