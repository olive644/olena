import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProfileDataExport } from "./profile-preferences";
import { createInitialWorkspace } from "../domain/workspace";
import { downloadExportBlob } from "../data/paper-export-art";

vi.mock("../data/paper-export-art", () => ({ downloadExportBlob: vi.fn() }));
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

it("bloqueia exportação até a conta estar pronta e baixa JSON sem chamada de rede", () => {
  const workspace = createInitialWorkspace();
  const { rerender } = render(<ProfileDataExport workspace={workspace} ready={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Exportar meus dados" }));
  expect(downloadExportBlob).not.toHaveBeenCalled();
  rerender(<ProfileDataExport workspace={workspace} ready />);
  const network = vi.spyOn(globalThis, "fetch");
  fireEvent.click(screen.getByRole("button", { name: "Exportar meus dados" }));
  expect(downloadExportBlob).toHaveBeenCalledWith(expect.any(Blob), "olena-estudos.json");
  expect(vi.mocked(downloadExportBlob).mock.calls[0]?.[0].type).toBe("application/json");
  expect(network).not.toHaveBeenCalled();
  network.mockRestore();
});

it("informa falha de leitura sem fingir que o download aconteceu", () => {
  render(<ProfileDataExport workspace={createInitialWorkspace()} ready />);
  const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("denied");
  });
  fireEvent.click(screen.getByRole("button", { name: "Exportar meus dados" }));
  expect(screen.getByRole("alert").textContent).toContain("Não foi possível exportar");
  expect(downloadExportBlob).not.toHaveBeenCalled();
  read.mockRestore();
});
