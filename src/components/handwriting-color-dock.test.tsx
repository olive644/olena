import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HandwritingColorDock } from "./handwriting-color-dock";

vi.mock("./handwriting-quick-colors", () => ({
  HandwritingQuickColors: () => <div className="handwriting-quick-colors">cores</div>,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup() {
  const view = render(
    <div className="handwriting-workspace">
      <div className="handwriting-viewport" />
      <button className="handwriting-paper-disclosure">papéis</button>
      <HandwritingColorDock active color="#17151c" onColorChange={vi.fn()} />
    </div>,
  );
  const node = view.container.querySelector<HTMLElement>(".handwriting-color-dock")!;
  const parent = node.parentElement!;
  Object.defineProperty(node, "offsetParent", { configurable: true, get: () => parent });
  Object.defineProperty(node, "offsetWidth", {
    configurable: true,
    get: () => (["top", "bottom"].includes(node.dataset["edge"] ?? "") ? 400 : 52),
  });
  Object.defineProperty(node, "offsetHeight", {
    configurable: true,
    get: () => (["top", "bottom"].includes(node.dataset["edge"] ?? "") ? 52 : 400),
  });
  const viewport = parent.querySelector<HTMLElement>(".handwriting-viewport")!;
  Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 900 });
  Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 700 });
  viewport.getBoundingClientRect = () => new DOMRect(0, 0, 900, 700);
  fireEvent(window, new Event("resize"));
  return { node, view };
}

it("só mostra a paleta quando as opções de ferramenta estão expandidas", () => {
  const { container, rerender } = render(
    <HandwritingColorDock active={false} color="#17151c" onColorChange={vi.fn()} />,
  );
  expect(container.firstElementChild?.hasAttribute("hidden")).toBe(true);
  rerender(<HandwritingColorDock active color="#17151c" onColorChange={vi.fn()} />);
  expect(container.firstElementChild?.hasAttribute("hidden")).toBe(false);
});

it("o teclado encaixa nas quatro bordas sem deixar a paleta no centro", () => {
  const { node } = setup();
  const grip = screen.getByRole("button", { name: "Mover paleta de cores" });
  for (const [key, edge] of [
    ["ArrowUp", "top"],
    ["ArrowDown", "bottom"],
    ["ArrowLeft", "left"],
    ["ArrowRight", "right"],
  ]) {
    act(() => fireEvent.keyDown(grip, { key }));
    expect(node.dataset["edge"]).toBe(edge);
    expect(node.style.transform).not.toBe("");
  }
});

it.each([
  ["pointerup", "bottom"],
  ["pointercancel", "left"],
] as const)("arrastar e terminar com %s mantém a paleta encaixada", (endEvent, edge) => {
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      pointerId: number;
      constructor(type: string, options: MouseEventInit & { pointerId?: number }) {
        super(type, options);
        this.pointerId = options.pointerId ?? 1;
      }
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const { node } = setup();
  const grip = screen.getByRole("button", { name: "Mover paleta de cores" });
  Object.defineProperty(grip, "setPointerCapture", { configurable: true, value: vi.fn() });
  Object.defineProperty(grip, "hasPointerCapture", { configurable: true, value: () => false });
  fireEvent.pointerDown(grip, { button: 0, pointerId: 1, clientX: 20, clientY: 20 });
  expect(node.dataset["dragging"]).toBe("true");
  fireEvent.pointerMove(grip, { pointerId: 1, clientX: 450, clientY: 690 });
  fireEvent(
    grip,
    new PointerEvent(endEvent, { bubbles: true, pointerId: 1, clientX: 450, clientY: 698 }),
  );
  expect(node.dataset["edge"]).toBe(edge);
  expect(node.dataset["dragging"]).toBeUndefined();
  expect(node.style.transform).not.toBe("translate(0px, 0px)");
});

it("minimiza em estojo e reabre a paleta", () => {
  render(<HandwritingColorDock active color="#17151c" onColorChange={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Minimizar paleta de cores" }));
  expect(screen.queryByText("cores")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Abrir estojo de cores" }));
  expect(screen.getByText("cores")).toBeTruthy();
});
