import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ConnectedDevices } from "./connected-devices";
import { requestAccountDevices } from "../data/account-devices";
vi.mock("../data/account-devices", () => ({ requestAccountDevices: vi.fn() }));
it("mostra acessos reais sob demanda e permite recolher", async () => {
  vi.mocked(requestAccountDevices).mockResolvedValue({
    currentId: "a",
    devices: [
      { id: "a", browser: "Chrome", system: "Windows", lastSeen: Date.now() },
      { id: "b", browser: "Safari", system: "iOS", lastSeen: Date.now() },
    ],
  });
  render(<ConnectedDevices />);
  expect(requestAccountDevices).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Mostrar dispositivos" }));
  expect(await screen.findByText("Este dispositivo")).toBeTruthy();
  expect(screen.getByText("Safari · iOS")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ocultar dispositivos" }));
  expect(screen.queryByText("Safari · iOS")).toBeNull();
});
it("não inventa uma lista quando a consulta falha", async () => {
  vi.mocked(requestAccountDevices).mockRejectedValue(new Error("offline"));
  render(<ConnectedDevices />);
  fireEvent.click(screen.getByRole("button", { name: "Mostrar dispositivos" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Este dispositivo")).toBeNull();
});
