import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PomodoroDurationPicker } from "./pomodoro-duration-picker";
it("aplica horas e minutos sem exibir 1000 minutos", () => {
  const onChange = vi.fn();
  render(<PomodoroDurationPicker label="Estudo" value={1000} onChange={onChange} />);
  expect(screen.getByRole("slider", { name: "Estudo" }).getAttribute("aria-valuetext")).toBe(
    "16 h 40 min",
  );
  fireEvent.change(screen.getByRole("spinbutton", { name: "Horas" }), { target: { value: "1" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Minutos" }), {
    target: { value: "30" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Usar duração" }));
  expect(onChange).toHaveBeenCalledWith(90);
});
it("rejeita duração nula sem alterar a preferência", () => {
  const onChange = vi.fn();
  render(<PomodoroDurationPicker label="Pausa" value={5} onChange={onChange} />);
  fireEvent.change(screen.getByRole("spinbutton", { name: "Minutos" }), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "Usar duração" }));
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(onChange).not.toHaveBeenCalled();
});
