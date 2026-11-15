import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OlenaShelfCat, ShelfVines } from "./olena-shelf-art";

type Options = { src: string; stateMachines: string; onLoad: () => void };
let created: FakeRive[] = [];
const clique = { name: "clique", value: 0 };
class FakeRive {
  options: Options;
  play = vi.fn();
  pause = vi.fn();
  cleanup = vi.fn();
  resizeDrawingSurfaceToCanvas = vi.fn();
  stateMachineInputs = vi.fn(() => [clique]);
  constructor(options: Options) {
    this.options = options;
    created.push(this);
  }
}

beforeEach(() => {
  created = [];
  clique.value = 0;
  vi.stubGlobal("rive", {
    Rive: FakeRive,
    Layout: class {},
    Fit: { Contain: "contain" },
    RuntimeLoader: { setWasmUrl: vi.fn() },
  });
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("anima a Olena dormindo com o arquivo e a máquina de estados certos", async () => {
  const view = render(<OlenaShelfCat src="/olena-shelf-sleeping.webp" />);
  await act(async () => {});
  expect(created).toHaveLength(1);
  const rive = created[0]!;
  expect(rive.options.src).toMatch(/^\/olena-prateleira\/olena-dormindo\.riv/);
  expect(rive.options.stateMachines).toBe("Olena");
  const wrapper = view.container.querySelector(".notebook-shelf-cat")!;
  expect(wrapper.getAttribute("data-ready")).toBe("false");
  act(() => rive.options.onLoad());
  expect(rive.play).toHaveBeenCalled();
  expect(wrapper.getAttribute("data-ready")).toBe("true");
  // decoração: fora da árvore de acessibilidade, com a imagem estática por baixo
  expect(wrapper.getAttribute("aria-hidden")).toBe("true");
  expect(wrapper.querySelector("img")?.getAttribute("src")).toBe("/olena-shelf-sleeping.webp");
  view.unmount();
  expect(rive.cleanup).toHaveBeenCalled();
});

it("tocar na Olena liga a entrada clique por um instante e desliga", async () => {
  vi.useFakeTimers();
  const view = render(<OlenaShelfCat src="/olena-shelf-sleeping.webp" />);
  await act(async () => {});
  act(() => created[0]!.options.onLoad());
  fireEvent.pointerDown(view.container.querySelector("canvas")!);
  expect(clique.value).toBe(1);
  act(() => {
    vi.advanceTimersByTime(200);
  });
  expect(clique.value).toBe(0);
});

it("a hera tem as 16 folhas de CSS e anima em Rive cada lado com a máquina Hera", async () => {
  const view = render(
    <>
      <ShelfVines side="left" />
      <ShelfVines side="right" />
    </>,
  );
  await act(async () => {});
  expect(created).toHaveLength(2);
  for (const rive of created) {
    expect(rive.options.src).toMatch(/^\/olena-prateleira\/hera\.riv/);
    expect(rive.options.stateMachines).toBe("Hera");
  }
  const sides = view.container.querySelectorAll(".notebook-shelf-vines");
  expect(sides[0]!.classList.contains("is-left")).toBe(true);
  expect(sides[1]!.classList.contains("is-right")).toBe(true);
  for (const side of sides) {
    expect(side.querySelectorAll("i")).toHaveLength(16);
    expect(side.getAttribute("aria-hidden")).toBe("true");
    expect(side.getAttribute("data-ready")).toBe("false");
  }
  act(() => created[0]!.options.onLoad());
  expect(sides[0]!.getAttribute("data-ready")).toBe("true");
  expect(sides[1]!.getAttribute("data-ready")).toBe("false");
});

it("com movimento reduzido ficam só a imagem e as folhas de CSS, sem carregar o Rive", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const view = render(
    <>
      <OlenaShelfCat src="/olena-shelf-sleeping.webp" />
      <ShelfVines side="left" />
    </>,
  );
  await act(async () => {});
  expect(created).toHaveLength(0);
  expect(view.container.querySelector("canvas")).toBeNull();
  expect(view.container.querySelector(".notebook-shelf-cat img")).not.toBeNull();
  expect(view.container.querySelectorAll(".notebook-shelf-vines i")).toHaveLength(16);
});
