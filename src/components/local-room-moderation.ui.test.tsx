import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LobbyLockToggle, LobbyParticipants } from "./local-room-lobby-presentation";
import { RoomTeamBoard } from "./room-team-board";

const people = [
  { id: "p1", displayName: "Ana", score: 0, team: "Roxo" as const },
  { id: "p2", displayName: "Bia", score: 0, team: "Amarelo" as const },
];

it("a lista do lobby só mostra remover para o anfitrião e entrega o id certo", async () => {
  const onRemove = vi.fn(async () => true);
  const { rerender } = render(<LobbyParticipants participants={people} />);
  expect(screen.queryByRole("button", { name: /Remover/ })).toBeNull();

  rerender(<LobbyParticipants participants={people} onRemove={onRemove} />);
  fireEvent.click(screen.getByRole("button", { name: "Remover Bia da sala" }));
  expect(onRemove).toHaveBeenCalledWith("p2");
});

it("o quadro de equipes do anfitrião também permite remover", async () => {
  const onRemove = vi.fn(async () => true);
  render(
    <RoomTeamBoard
      participants={people}
      isHost
      participantId=""
      onAssign={async () => true}
      onRemove={onRemove}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Remover Ana da sala" }));
  expect(onRemove).toHaveBeenCalledWith("p1");
});

it("o quadro de equipes do participante não oferece remover", () => {
  render(
    <RoomTeamBoard
      participants={people}
      isHost={false}
      participantId="p1"
      onAssign={async () => true}
    />,
  );
  expect(screen.queryByRole("button", { name: /Remover/ })).toBeNull();
});

it("o botão de entrada alterna entre fechar e reabrir e explica o estado", async () => {
  const onChange = vi.fn(async () => true);
  const { rerender } = render(<LobbyLockToggle locked={false} onChange={onChange} />);
  expect(screen.getByText("Quem tem o código ainda pode entrar.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Fechar entrada" }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(true));

  rerender(<LobbyLockToggle locked onChange={onChange} />);
  expect(screen.getByText(/Entrada fechada/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reabrir entrada" }));
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(false));
});
