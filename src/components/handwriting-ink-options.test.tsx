import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { HandwritingInkOptions } from "./handwriting-ink-options";

for (const tool of ["pen", "highlighter", "eraser"] as const) {
  it(`${tool}: permite escolher cada percentual entre 0 e 100 sem tamanho invisível`, () => {
    const onWidthChange = vi.fn();
    const props = { tool, width: 0.5, color: "#17151c", onColorChange: vi.fn(), onWidthChange };
    const view = render(<HandwritingInkOptions {...props} />);
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("min")).toBe("0");
    expect(slider.getAttribute("max")).toBe("100");
    expect(slider.getAttribute("step")).toBe("1");
    expect(slider.getAttribute("aria-valuetext")).toBe("0%");
    fireEvent.change(slider, { target: { value: "100" } });
    expect(onWidthChange).toHaveBeenLastCalledWith(40);
    view.rerender(<HandwritingInkOptions {...props} width={40} />);
    fireEvent.change(slider, { target: { value: "37" } });
    expect(onWidthChange.mock.calls.at(-1)?.[0]).toBeCloseTo(15.115);
    fireEvent.change(slider, { target: { value: "0" } });
    expect(onWidthChange).toHaveBeenLastCalledWith(0.5);
    if (tool === "eraser") expect(screen.queryByRole("button", { name: "Tinta Roxo" })).toBeNull();
  });
}
