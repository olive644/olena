import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ProfileStreaks } from "./profile-streaks";
import { createInitialWorkspace } from "../domain/workspace";
afterEach(cleanup);
it("mostra imediatamente a sequência zero do workspace carregado, sem aguardar rede", () => {
  localStorage.removeItem("noteoli.pomodoro-streak.v1");
  render(<ProfileStreaks workspace={createInitialWorkspace()} />);
  expect(screen.getByLabelText("Ilhas: 0 dias seguidos").textContent).toBe("0");
});
