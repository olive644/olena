import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoomRewardNotice } from "./room-reward-notice";
import { ROOM_XP_KEY } from "../data/room-xp";
const reward = { id: "round:player", place: 2, xp: 75, completedAt: 1000 };
describe("notificação final de XP", () => {
  beforeEach(() => localStorage.clear());
  it("credits XP while presentation is deferred and displays it later without a second credit", async () => {
    vi.useFakeTimers();
    try {
      const view = render(<RoomRewardNotice reward={reward} deferPresentation />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });
      const saved = localStorage.getItem(ROOM_XP_KEY);
      expect(JSON.parse(saved!).total).toBe(75);
      expect(screen.queryByRole("status")).toBeNull();
      view.rerender(<RoomRewardNotice reward={reward} deferPresentation={false} />);
      expect(screen.getByRole("status")).toBeTruthy();
      expect(localStorage.getItem(ROOM_XP_KEY)).toBe(saved);
      view.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
  it("desativar o aviso não impede crédito de XP", async () => {
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({ notificationPreferences: { rewards: false } }),
    );
    render(<RoomRewardNotice reward={reward} />);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(ROOM_XP_KEY)!).total).toBe(75));
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("erro ao salvar XP continua visível mesmo com avisos desativados", async () => {
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({ notificationPreferences: { rewards: false } }),
    );
    localStorage.setItem(ROOM_XP_KEY, "corrompido");
    render(<RoomRewardNotice reward={reward} />);
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("Não foi possível salvar"),
    );
    expect(localStorage.getItem(ROOM_XP_KEY)).toBe("corrompido");
  });
  it("credita Matemática antes de exibir o aviso atrasado e preserva o recibo se sair", async () => {
    vi.useFakeTimers();
    try {
      const view = render(
        <RoomRewardNotice reward={reward} activity="mathematics" delayMs={1200} />,
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(JSON.parse(localStorage.getItem(ROOM_XP_KEY)!).total).toBe(75);
      expect(screen.queryByRole("status")).toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1200);
      });
      expect(screen.getByRole("status").textContent).toContain(
        "+75 XP pela prática de Matemática!",
      );
      view.unmount();
      render(<RoomRewardNotice reward={reward} activity="mathematics" delayMs={1200} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1201);
      });
      expect(screen.queryByRole("status")).toBeNull();
      expect(JSON.parse(localStorage.getItem(ROOM_XP_KEY)!).total).toBe(75);
    } finally {
      vi.useRealTimers();
    }
  });
  it("avisa a colocação, permite fechar e não credita outra vez ao reabrir", async () => {
    const view = render(<RoomRewardNotice reward={reward} />);
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("+75 XP pelo 2º lugar!"),
    );
    const close = screen.getByRole("button", { name: "Fechar notificação de XP" });
    expect(close.querySelector('[data-paper-editor-icon="close"]')).toBeTruthy();
    expect(close.textContent).toBe("");
    fireEvent.click(close);
    expect(screen.queryByRole("status")).toBeNull();
    view.unmount();
    render(<RoomRewardNotice reward={reward} />);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(ROOM_XP_KEY)!).total).toBe(75));
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("não credita XP durante uma rodada sem recompensa", () => {
    render(<RoomRewardNotice reward={undefined} />);
    expect(localStorage.getItem(ROOM_XP_KEY)).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("fecha automaticamente após seis segundos sem apagar o recibo", async () => {
    vi.useFakeTimers();
    try {
      render(<RoomRewardNotice reward={reward} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(screen.getByRole("status")).toBeTruthy();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });
      expect(screen.queryByRole("status")).toBeNull();
      expect(JSON.parse(localStorage.getItem(ROOM_XP_KEY)!).total).toBe(75);
    } finally {
      vi.useRealTimers();
    }
  });
});

it("English presents previously settled XP after review without writing a second receipt", async () => {
  localStorage.clear();
  localStorage.setItem(
    ROOM_XP_KEY,
    JSON.stringify({
      total: 20,
      receipts: ["english:answer"],
      legacy: 0,
      legacyReceipts: [],
      rewards: { "english:answer": 20 },
    }),
  );
  const before = localStorage.getItem(ROOM_XP_KEY);
  const view = render(
    <RoomRewardNotice
      reward={{ ...reward, xp: 20 }}
      activity="english"
      presentationOnly
      deferPresentation
    />,
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(screen.queryByRole("status")).toBeNull();
  view.rerender(
    <RoomRewardNotice reward={{ ...reward, xp: 20 }} activity="english" presentationOnly />,
  );
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain("+20 XP pela prática de Inglês!"),
  );
  expect(localStorage.getItem(ROOM_XP_KEY)).toBe(before);
  view.unmount();
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ notificationPreferences: { rewards: false } }),
  );
  render(<RoomRewardNotice reward={{ ...reward, xp: 20 }} activity="english" presentationOnly />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(screen.queryByRole("status")).toBeNull();
  expect(localStorage.getItem(ROOM_XP_KEY)).toBe(before);
});
