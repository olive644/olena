import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { HandwritingQuickColors } from "./handwriting-quick-colors";
import { hexToHsv, hsvToHex } from "./handwriting-color-picker";
it.each(["#000000", "#ffffff", "#17151c", "#ff0000", "#00ff00", "#0000ff", "#123456", "#facc15"])(
  "converte HSV sem perder a cor %s",
  (color) => {
    const { h, s, v } = hexToHsv(color);
    expect(hsvToHex(h, s, v)).toBe(color);
  },
);
it("edita RGB e fecha o painel com Escape sem abrir o seletor nativo", () => {
  const change = vi.fn();
  render(<HandwritingQuickColors color="#123456" onColorChange={change} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher outra cor" }));
  expect(screen.getByRole("dialog", { name: "Cor da tinta" })).toBeTruthy();
  fireEvent.change(screen.getByRole("spinbutton", { name: "R" }), { target: { value: "255" } });
  expect(change).toHaveBeenCalledWith("#ff3456");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Cor da tinta" })).toBeNull();
});
