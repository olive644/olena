import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { RiveInput } from "../data/rive-runtime";
import { OliverHeroArt } from "./oliver-hero-art";

type Options = {
  src: string;
  stateMachines: string;
  onLoad: () => void;
  onLoadError: () => void;
};
let created: FakeRive[] = [];
const wasm = vi.fn();
class FakeRive {
  options: Options;
  inputs: RiveInput[] = ["olharX", "clique"].map((name) => ({ name, value: 0 }));
  play = vi.fn();
  pause = vi.fn();
  cleanup = vi.fn();
  resizeDrawingSurfaceToCanvas = vi.fn();
  constructor(options: Options) {
    this.options = options;
    created.push(this);
  }
  stateMachineInputs() {
    return this.inputs;
  }
  value(name: string) {
    return this.inputs.find((input) => input.name === name)?.value;
  }
}

beforeEach(() => {
  created = [];
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("rive", {
    Rive: FakeRive,
    Layout: class {},
    Fit: { Contain: "contain" },
    RuntimeLoader: { setWasmUrl: wasm },
  });
  // O palco ocupa 200 x 200 a partir de (100, 100).
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    left: 100,
    right: 300,
    top: 100,
    bottom: 300,
    width: 200,
    height: 200,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function activate(view: ReturnType<typeof render>) {
  act(() => vi.advanceTimersByTime(900));
  await act(async () => {
    await Promise.resolve();
  });
  const instance = created.at(-1)!;
  act(() => instance.options.onLoad());
  return { instance, stage: view.container.firstElementChild as HTMLElement };
}

it("com movimento reduzido mantém só a imagem e não baixa nada", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const view = render(<OliverHeroArt />);
  act(() => vi.advanceTimersByTime(5000));
  expect(view.container.querySelector("canvas")).toBeNull();
  expect(created).toHaveLength(0);
  const art = view.getByAltText("Oliver aparece por trás do widget de Matemática");
  expect(art.getAttribute("src")).toBe("/oliver-peeking-widget.webp");
});

it("a preferência do app por menos movimento também mantém a imagem estática", () => {
  document.documentElement.dataset["reduceMotion"] = "true";
  try {
    const view = render(<OliverHeroArt />);
    act(() => vi.advanceTimersByTime(5000));
    expect(created).toHaveLength(0);
    expect(view.container.querySelector("canvas")).toBeNull();
  } finally {
    delete document.documentElement.dataset["reduceMotion"];
  }
});

it("espera o primeiro quadro e carrega o arquivo na máquina Oliver, do próprio site", async () => {
  const view = render(<OliverHeroArt />);
  expect(created).toHaveLength(0);
  expect(view.container.querySelector("canvas")).toBeNull();
  const { instance, stage } = await activate(view);
  expect(instance.options.src).toBe("/oliver-peeking-widget/oliver.riv?v=1");
  expect(instance.options.stateMachines).toBe("Oliver");
  expect(wasm).toHaveBeenCalledWith("/helena-assistant/rive.wasm?v=2.43.0");
  expect(stage.getAttribute("data-ready")).toBe("true");
  expect(view.container.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
  // a imagem continua sendo o elemento acessível
  expect(view.getByAltText("Oliver aparece por trás do widget de Matemática")).toBeTruthy();
});

it("cumprimenta uma vez ao ficar pronto e volta a entrada ao repouso", async () => {
  const view = render(<OliverHeroArt />);
  const { instance } = await activate(view);
  expect(instance.value("clique")).toBe(0);
  act(() => vi.advanceTimersByTime(700));
  expect(instance.value("clique")).toBe(2);
  act(() => vi.advanceTimersByTime(90));
  expect(instance.value("clique")).toBe(0);
});

it("inclina para o mouse com suavidade e ignora o toque", async () => {
  const view = render(<OliverHeroArt />);
  const { instance } = await activate(view);
  Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
  fireEvent.pointerMove(window, { pointerType: "touch", clientX: 900, clientY: 200 });
  act(() => vi.advanceTimersByTime(500));
  expect(instance.value("olharX")).toBe(0);
  // 100 px à direita do centro (200) em uma janela de 1000 px: alvo 0,2
  fireEvent.pointerMove(window, { pointerType: "mouse", clientX: 300, clientY: 200 });
  act(() => vi.advanceTimersByTime(16));
  const first = Number(instance.value("olharX"));
  expect(first).toBeGreaterThan(0);
  expect(first).toBeLessThan(0.2);
  act(() => vi.advanceTimersByTime(1000));
  expect(instance.value("olharX")).toBeCloseTo(0.2, 5);
  // muito longe, a inclinação satura em 1
  fireEvent.pointerMove(window, { pointerType: "mouse", clientX: -5000, clientY: 200 });
  act(() => vi.advanceTimersByTime(1000));
  expect(instance.value("olharX")).toBe(-1);
  fireEvent.pointerLeave(document.documentElement);
  act(() => vi.advanceTimersByTime(1000));
  expect(instance.value("olharX")).toBe(0);
});

it("reage ao toque sobre a arte, em ciclo, e deixa botões e fora dela em paz", async () => {
  const view = render(
    <>
      <OliverHeroArt />
      <button type="button">Explorar Matemática</button>
    </>,
  );
  const { instance } = await activate(view);
  act(() => vi.advanceTimersByTime(800));
  expect(instance.value("clique")).toBe(0);
  const seen: unknown[] = [];
  for (let i = 0; i < 4; i++) {
    fireEvent.pointerDown(view.container, { clientX: 200, clientY: 200 });
    seen.push(instance.value("clique"));
    act(() => vi.advanceTimersByTime(90));
    expect(instance.value("clique")).toBe(0);
  }
  expect(seen).toEqual([1, 2, 3, 1]);
  fireEvent.pointerDown(view.container, { clientX: 400, clientY: 200 });
  expect(instance.value("clique")).toBe(0);
  fireEvent.pointerDown(view.getByRole("button"), { clientX: 200, clientY: 200 });
  expect(instance.value("clique")).toBe(0);
});

it("pausa fora da tela e retoma ao voltar", async () => {
  let notify: (visible: boolean) => void = () => undefined;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = (visible) => callback([entry(visible)], this as unknown as IntersectionObserver);
      }
      observe() {}
      disconnect() {}
    },
  );
  const rect = new DOMRect(100, 100, 200, 200);
  const entry = (visible: boolean): IntersectionObserverEntry => ({
    isIntersecting: visible,
    target: document.body,
    boundingClientRect: rect,
    intersectionRatio: visible ? 1 : 0,
    intersectionRect: rect,
    rootBounds: null,
    time: 0,
  });
  const view = render(<OliverHeroArt />);
  const { instance } = await activate(view);
  expect(instance.play).toHaveBeenCalled();
  act(() => notify(false));
  expect(instance.pause).toHaveBeenCalled();
  instance.play.mockClear();
  act(() => notify(true));
  expect(instance.play).toHaveBeenCalled();
});

it("se o arquivo não carrega, a imagem estática continua valendo", async () => {
  const view = render(<OliverHeroArt />);
  act(() => vi.advanceTimersByTime(900));
  await act(async () => {
    await Promise.resolve();
  });
  act(() => created.at(-1)!.options.onLoadError());
  const stage = view.container.firstElementChild as HTMLElement;
  expect(stage.getAttribute("data-ready")).toBe("false");
  expect(view.getByAltText("Oliver aparece por trás do widget de Matemática")).toBeTruthy();
});

it("libera o Rive ao sair da tela", async () => {
  const view = render(<OliverHeroArt />);
  const { instance } = await activate(view);
  view.unmount();
  expect(instance.cleanup).toHaveBeenCalledTimes(1);
});
