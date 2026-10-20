import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { RiveInput } from "../data/rive-runtime";
import { HelenaMascot } from "./helena-mascot";
import portuguese from "../../public/locales/pt-BR.json";
import { installUiCatalog } from "../i18n/runtime";

const props = { open: false, motion: "idle", tilt: { x: 0, y: 0 }, hover: false };

it("keeps the Rive state machine identifier independent of interface labels", async () => {
  const labels = [...portuguese];
  labels[381] = "A translated display label";
  installUiCatalog("pt-BR", labels);
  try {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const view = render(<HelenaMascot {...props} />);
    const { instance } = await activate(view);
    expect(instance.options.stateMachines).toBe("Helena");
  } finally {
    installUiCatalog("pt-BR", portuguese);
  }
});

type Options = {
  src: string;
  stateMachines: string;
  onLoad: () => void;
  onLoadError: () => void;
  onStateChange: (event: { data?: unknown }) => void;
};
let created: FakeRive[] = [];
const wasm = vi.fn();
class FakeRive {
  options: Options;
  inputs: RiveInput[] = ["aberta", "arrastando", "atenta", "lado", "olharX", "clique"].map(
    (name) => ({
      name,
      value: name === "lado" || name === "olharX" || name === "clique" ? 0 : false,
    }),
  );
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
  vi.stubGlobal("rive", {
    Rive: FakeRive,
    Layout: class {},
    Fit: { Contain: "contain" },
    RuntimeLoader: { setWasmUrl: wasm },
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function activate(view: ReturnType<typeof render>) {
  await act(async () => {
    await Promise.resolve();
  });
  const instance = created.at(-1)!;
  act(() => instance.options.onLoad());
  return { instance, host: view.container.firstElementChild as HTMLElement };
}

it("com movimento reduzido nao carrega o Rive e mantem a pose estatica certa", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const view = render(<HelenaMascot {...props} />);
  expect(view.container.querySelector("canvas")).toBeNull();
  expect(created).toHaveLength(0);
  expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
    "/helena-assistant/star-rive.png",
  );
  view.rerender(<HelenaMascot {...props} open />);
  expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
    "/helena-assistant/helena-rive.png",
  );
});

it("carrega o arquivo proprio na maquina Helena, com o WebAssembly do proprio site", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const view = render(<HelenaMascot {...props} />);
  expect(created).toHaveLength(0);
  const { instance, host } = await activate(view);
  expect(instance.options.src).toBe("/helena-assistant/helena.riv?v=1");
  expect(instance.options.stateMachines).toBe("Helena");
  expect(wasm).toHaveBeenCalledWith("/helena-assistant/rive.wasm?v=2.43.0");
  expect(host.getAttribute("data-ready")).toBe("true");
  expect(view.container.querySelector("canvas")).not.toBeNull();
  act(() => instance.options.onStateChange({ data: ["vira-helena"] }));
  expect(host.dataset["form"]).toBe("transforming");
  act(() => instance.options.onStateChange({ data: ["helena-parada", "olhar-passeia"] }));
  expect(host.dataset["form"]).toBe("helena");
  expect(host.dataset["state"]).toBe("helena-parada");
});

it("passa so o estado visual: aberta, arrasto com lado, atencao e olhar", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const view = render(<HelenaMascot {...props} />);
  const { instance } = await activate(view);
  expect(instance.value("aberta")).toBe(false);
  view.rerender(<HelenaMascot {...props} open />);
  expect(instance.value("aberta")).toBe(true);
  view.rerender(<HelenaMascot {...props} motion="dragging" tilt={{ x: 9, y: 36 }} />);
  expect(instance.value("arrastando")).toBe(true);
  expect(instance.value("lado")).toBe(1);
  expect(instance.value("atenta")).toBe(false);
  view.rerender(<HelenaMascot {...props} hover tilt={{ x: 0, y: -9 }} />);
  expect(instance.value("arrastando")).toBe(false);
  expect(instance.value("lado")).toBe(0);
  expect(instance.value("atenta")).toBe(true);
  expect(instance.value("olharX")).toBe(-0.5);
  expect(instance.value("clique")).toBe(0);
});

it("inicia o carregamento imediatamente e só conta o ciclo depois de carregar", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  render(<HelenaMascot {...props} />);
  await act(async () => {
    await Promise.resolve();
  });
  expect(created).toHaveLength(1);
  const instance = created[0]!;
  act(() => vi.advanceTimersByTime(10000));
  act(() => instance.options.onLoad());
  expect(instance.value("aberta")).toBe(false);
  act(() => vi.advanceTimersByTime(2799));
  expect(instance.value("aberta")).toBe(false);
  act(() => vi.advanceTimersByTime(1));
  expect(instance.value("aberta")).toBe(true);
});

it("recolhida, alterna estrela por 2,8 s e Olena por 13 s, e segura a Olena com o ponteiro por perto", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const view = render(<HelenaMascot {...props} />);
  const { instance } = await activate(view);
  expect(instance.value("aberta")).toBe(false);
  act(() => vi.advanceTimersByTime(2800));
  expect(instance.value("aberta")).toBe(true);
  view.rerender(<HelenaMascot {...props} hover />);
  act(() => vi.advanceTimersByTime(20000));
  expect(instance.value("aberta")).toBe(true);
  view.rerender(<HelenaMascot {...props} />);
  act(() => vi.advanceTimersByTime(12999));
  expect(instance.value("aberta")).toBe(true);
  act(() => vi.advanceTimersByTime(1));
  expect(instance.value("aberta")).toBe(false);
});

it("ao recolher a conversa volta a ser estrela na hora", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const view = render(<HelenaMascot {...props} open />);
  const { instance } = await activate(view);
  expect(instance.value("aberta")).toBe(true);
  view.rerender(<HelenaMascot {...props} motion="closing" />);
  expect(instance.value("aberta")).toBe(false);
});

it("cede a vez a outras telas e volta depois da interacao, sem recriar o arquivo", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const view = render(<HelenaMascot {...props} />);
  const { instance } = await activate(view);
  const other = document.createElement("button");
  document.body.append(other);
  try {
    fireEvent.pointerDown(other);
    expect(instance.pause).toHaveBeenCalled();
    instance.play.mockClear();
    act(() => vi.advanceTimersByTime(1499));
    expect(instance.play).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(instance.play).toHaveBeenCalled();
    expect(created).toHaveLength(1);
  } finally {
    other.remove();
  }
});

it("se o arquivo nao carrega, a imagem estatica continua valendo", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const view = render(<HelenaMascot {...props} />);
  await act(async () => {
    vi.advanceTimersByTime(1500);
    await Promise.resolve();
  });
  act(() => created.at(-1)!.options.onLoadError());
  expect(view.container.firstElementChild?.getAttribute("data-ready")).toBe("false");
  expect(view.container.querySelector("img")).not.toBeNull();
});

it("ao sair de cena libera o runtime", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const view = render(<HelenaMascot {...props} />);
  const { instance } = await activate(view);
  view.unmount();
  expect(instance.cleanup).toHaveBeenCalled();
});
