import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPenMeter } from "./handwriting-pen-meter";
import { HandwritingPenMeterPanel } from "./handwriting-pen-meter-panel";

describe("painel do medidor da caneta", () => {
  afterEach(() => vi.useRealTimers());

  it("pede para escrever e depois mostra os números do traço", () => {
    vi.useFakeTimers();
    const meter = { current: createPenMeter() };
    const sheet = { current: document.createElement("canvas") };
    render(<HandwritingPenMeterPanel meter={meter} sheet={sheet} />);
    expect(screen.getByText("Escreva uma palavra para medir")).toBeTruthy();

    meter.current.begin(0);
    meter.current.recordEvent(10, 2, 14);
    meter.current.recordFrame(0);
    meter.current.recordFrame(50);
    meter.current.end(1000);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText(/Entrada: 1 eventos\/s, 2 pontos\/s/)).toBeTruthy();
    expect(screen.getByText(/Quadros lentos \(mais de 33 ms\): 1 de 1/)).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "Medidor da caneta" })).toBeTruthy();
  });
});
