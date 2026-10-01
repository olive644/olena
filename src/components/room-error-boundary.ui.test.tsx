import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RoomErrorBoundary } from "./room-error-boundary";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("mostra uma recuperação centralizada sem perder a mensagem", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  function Broken(): never {
    throw new Error("test");
  }
  render(
    <RoomErrorBoundary>
      <Broken />
    </RoomErrorBoundary>,
  );
  expect(screen.getByRole("alert").classList.contains("room-reconnect-error")).toBe(true);
  expect(screen.getByRole("button", { name: "Reconectar" })).toBeTruthy();
});
