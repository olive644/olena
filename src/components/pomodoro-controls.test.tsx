import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PomodoroControls } from "./pomodoro-controls";
it("uma seta expande e recolhe os três controles originais", () => {
  const onToggle = vi.fn();
  const onReset = vi.fn();
  const onFinish = vi.fn();
  render(
    <PomodoroControls
      label="Começar"
      icon={null}
      finishDisabled={false}
      onToggle={onToggle}
      onReset={onReset}
      onFinish={onFinish}
    />,
  );
  expect(screen.queryByRole("button", { name: "Começar" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Expandir controles do Pomodoro" }));
  fireEvent.click(screen.getByRole("button", { name: "Começar" }));
  fireEvent.click(screen.getByRole("button", { name: "Reiniciar contador" }));
  fireEvent.click(screen.getByRole("button", { name: "Encerrar e registrar" }));
  expect(onToggle).toHaveBeenCalledOnce();
  expect(onReset).toHaveBeenCalledOnce();
  expect(onFinish).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Recolher controles do Pomodoro" }));
  expect(screen.queryByRole("button", { name: "Começar" })).toBeNull();
});
