import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RoomPresenceEffects } from "./room-presence-effects";
import { LobbyParticipants, ShareRoom } from "./local-room-lobby-presentation";

afterEach(() => vi.useRealTimers());
const ana = { id: "ana", displayName: "Ana", level: 3, score: 0, online: true };

it("não anuncia a hidratação e mostra entrada, ausência e retorno uma única vez", () => {
  vi.useFakeTimers();
  const { rerender } = render(<RoomPresenceEffects code="ABCDE" participants={[ana]} />);
  expect(screen.queryByText(/entrou na sala/)).toBeNull();
  const bia = { ...ana, id: "bia", displayName: "Bia" };
  rerender(<RoomPresenceEffects code="ABCDE" participants={[ana, bia]} />);
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByText("Bia")).toBeTruthy();
  expect(screen.getByText(/entrou na sala/)).toBeTruthy();
  rerender(<RoomPresenceEffects code="ABCDE" participants={[{ ...ana }, { ...bia }]} />);
  act(() => vi.advanceTimersByTime(1800));
  expect(screen.queryByText("Bia")).toBeNull();
  rerender(<RoomPresenceEffects code="ABCDE" participants={[ana, { ...bia, online: false }]} />);
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByText(/saiu da sala/)).toBeTruthy();
  rerender(<RoomPresenceEffects code="ABCDE" participants={[ana, bia]} />);
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByText(/entrou na sala/)).toBeTruthy();
});

it("anuncia remoção sem deixar efeitos pendurados no desmontar", () => {
  vi.useFakeTimers();
  const { rerender, unmount } = render(<RoomPresenceEffects code="ABCDE" participants={[ana]} />);
  rerender(<RoomPresenceEffects code="ABCDE" participants={[]} />);
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByText(/saiu da sala/)).toBeTruthy();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("coloca nível antes da foto, estado exclusivo e X acessível depois da identidade", () => {
  render(<LobbyParticipants participants={[ana]} onRemove={async () => true} />);
  const badge = screen.getByLabelText("Nível 3");
  expect(badge.nextElementSibling?.tagName).toBe("IMG");
  expect(screen.getByRole("button", { name: "Remover Ana da sala" }).textContent).toBe("");
  expect(screen.getByText("Pronto").querySelector("svg")).toBeTruthy();
});

it("coloca fechar entrada imediatamente abaixo de copiar link, sem o texto removido", () => {
  render(<ShareRoom code="ABCDE" onLock={async () => true} />);
  const copy = screen.getByRole("button", { name: "Copiar link" });
  const lock = screen.getByRole("button", { name: "Fechar entrada" });
  expect(copy.parentElement).toBe(lock.parentElement?.parentElement);
  expect(screen.queryByText("Quem tem o código ainda pode entrar.")).toBeNull();
});
