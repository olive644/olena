import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PenInputTest, readPenInput } from "./pen-input-test";

afterEach(cleanup);

describe("teste de caneta e mesa", () => {
  it("lê dispositivo, pressão, inclinação e os três botões da caneta", () => {
    const base = { pointerType: "pen", button: 0, pressure: 0.456, tiltX: -20, tiltY: 35 };
    expect(readPenInput({ ...base, buttons: 1 })).toEqual({
      device: 355,
      pressure: 0.46,
      tilt: 35,
      buttons: [],
    });
    expect(readPenInput({ ...base, buttons: 3 }).buttons).toEqual([3814]);
    expect(readPenInput({ ...base, buttons: 5 }).buttons).toEqual([4008]);
    expect(readPenInput({ ...base, buttons: 33 }).buttons).toEqual([3817]);
    expect(readPenInput({ ...base, pointerType: "mouse", buttons: 1 }).device).toBe(4016);
  });

  it("mostra o que a caneta mandou e volta a aguardar ao sair da área", () => {
    render(<PenInputTest />);
    expect(screen.getByText("Aguardando a caneta")).toBeTruthy();
    const pad = screen.getByText("Aguardando a caneta").closest("div")!;
    fireEvent.pointerDown(pad, { pointerType: "pen", pressure: 0.5, buttons: 5, button: 0 });
    expect(screen.getByText("Dispositivo: Caneta")).toBeTruthy();
    expect(screen.getByText("Botões: Segundo botão")).toBeTruthy();
    fireEvent.pointerLeave(pad);
    expect(screen.getByText("Aguardando a caneta")).toBeTruthy();
  });
});
