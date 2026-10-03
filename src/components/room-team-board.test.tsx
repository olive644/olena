import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoomTeamBoard } from "./room-team-board";

const participants = [
  { id: "ana", displayName: "Ana", team: "Roxo", score: 0 },
  { id: "bia", displayName: "Bia", team: "Amarelo", score: 0 },
];
describe("organização de equipes", () => {
  it("permite participante escolher somente seu lado", () => {
    const onAssign = vi.fn().mockResolvedValue(true);
    render(
      <RoomTeamBoard
        participants={participants}
        isHost={false}
        participantId="ana"
        onAssign={onAssign}
      />,
    );
    expect(screen.queryByRole("button", { name: /Mover/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Entrar na equipe Roxo" }).hasAttribute("disabled"),
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Entrar na equipe Amarelo" }));
    expect(onAssign).toHaveBeenCalledWith("ana", "Amarelo");
  });
  it("oferece ao criador alternativa acessível ao arraste", () => {
    const onAssign = vi.fn().mockResolvedValue(true);
    render(
      <RoomTeamBoard participants={participants} isHost participantId="" onAssign={onAssign} />,
    );
    expect(screen.getByRole("button", { name: "Arrastar Ana" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mover Bia para Roxo" }));
    expect(onAssign).toHaveBeenCalledWith("bia", "Roxo");
  });
});
