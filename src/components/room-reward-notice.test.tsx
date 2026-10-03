import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { RoomRewardNotice } from "./room-reward-notice";
import { ROOM_XP_KEY } from "../data/room-xp";
const reward = { id: "round:player", place: 2, xp: 75, completedAt: 1000 };
describe("notificação final de XP", () => {
  beforeEach(() => localStorage.clear());
  it("avisa a colocação, permite fechar e não credita outra vez ao reabrir", async () => {
    const view = render(<RoomRewardNotice reward={reward} />);
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("75 XP pelo 2º lugar"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Fechar notificação de XP" }));
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
});
