import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { IslandSprites } from "./island-sprites";

const drawIsland = vi.fn();
const buildIslandSprites = vi.fn();

vi.mock("./island-sprites", () => ({
  buildIslandSprites: (...args: unknown[]) => buildIslandSprites(...args),
  drawIsland: (...args: unknown[]) => drawIsland(...args),
  groupDelta: () => ({ dx: 2, dy: -3 }),
}));

const fakeSprites = { size: 800, logicalSize: 880 } as unknown as IslandSprites;

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decoding = "";
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

class FakeResizeObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeEach(() => {
  vi.resetModules();
  drawIsland.mockReset();
  buildIslandSprites.mockReset();
  buildIslandSprites.mockResolvedValue(fakeSprites);
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.stubGlobal("requestIdleCallback", (callback: () => void) => window.setTimeout(callback, 0));
  vi.stubGlobal("cancelIdleCallback", (id: number) => window.clearTimeout(id));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function mount(props: Partial<{ active: boolean; reduceMotion: boolean }> = {}) {
  // O módulo de acessibilidade precisa ser a mesma instância que o componente usa depois do reset.
  const { updateAccessibility } = await import("../data/accessibility-preferences");
  updateAccessibility({ reduceMotion: props.reduceMotion ?? false });
  const { AnimatedIsland } = await import("./animated-island");
  const onReadyChange = vi.fn();
  const onShift = vi.fn();
  const view = render(
    <AnimatedIsland
      source="/practice-islands/mathematics.webp"
      active={props.active ?? true}
      anchor={{ x: 0.54, y: 0.45 }}
      onReadyChange={onReadyChange}
      onShift={onShift}
    />,
  );
  return { view, onReadyChange, onShift };
}

it("desenha a ilha num canvas escondido dos leitores de tela e avisa quando o primeiro quadro está pronto", async () => {
  const { view, onReadyChange, onShift } = await mount();
  await waitFor(() => expect(view.container.querySelector("canvas")).not.toBeNull());
  const canvas = view.container.querySelector("canvas");
  expect(canvas?.getAttribute("aria-hidden")).toBe("true");
  expect(canvas?.className).toBe("practice-island-canvas");
  await waitFor(() => expect(onReadyChange).toHaveBeenCalledWith(true));
  expect(drawIsland).toHaveBeenCalled();
  const [, sprites, , envelope] = drawIsland.mock.calls[0] as [unknown, unknown, number, number];
  expect(sprites).toBe(fakeSprites);
  // O primeiro quadro é a arte parada: a animação só entra aos poucos.
  expect(envelope).toBe(0);
  expect(onShift).toHaveBeenCalled();
});

it("o deslocamento do ponto de ancoragem chega em pixels e zera quando a ilha sai da tela", async () => {
  const { view, onShift } = await mount();
  await waitFor(() => expect(onShift).toHaveBeenCalled());
  view.unmount();
  expect(onShift).toHaveBeenLastCalledWith({ x: 0, y: 0 });
});

it("avisa que deixou de estar pronta ao desmontar", async () => {
  const { view, onReadyChange } = await mount();
  await waitFor(() => expect(onReadyChange).toHaveBeenCalledWith(true));
  view.unmount();
  expect(onReadyChange).toHaveBeenLastCalledWith(false);
});

it("com a ilha inativa o envelope fica em zero e a arte segue parada", async () => {
  const { onReadyChange } = await mount({ active: false });
  await waitFor(() => expect(onReadyChange).toHaveBeenCalledWith(true));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
  });
  for (const call of drawIsland.mock.calls) expect((call as unknown[])[3]).toBe(0);
});

it("em movimento reduzido não monta canvas nem baixa a arte", async () => {
  const { view, onReadyChange } = await mount({ reduceMotion: true });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
  expect(view.container.querySelector("canvas")).toBeNull();
  expect(buildIslandSprites).not.toHaveBeenCalled();
  expect(onReadyChange).not.toHaveBeenCalledWith(true);
});

it("sem canvas ou com falha na análise, a imagem parada continua valendo", async () => {
  buildIslandSprites.mockResolvedValue(null);
  const { view, onReadyChange } = await mount();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
  expect(buildIslandSprites).toHaveBeenCalled();
  expect(view.container.querySelector("canvas")).toBeNull();
  expect(onReadyChange).not.toHaveBeenCalledWith(true);
});

it("uma análise que lança erro também não derruba nada", async () => {
  buildIslandSprites.mockRejectedValue(new Error("falha"));
  const { view } = await mount();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
  expect(view.container.querySelector("canvas")).toBeNull();
});
