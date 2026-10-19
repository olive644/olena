import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { updateAccessibility } from "../data/accessibility-preferences";
import type { RiveInput } from "../data/rive-runtime";
import { useDisplayedTomatoStage } from "../hooks/use-displayed-tomato-stage";
import { AnimatedPomodoroTomato, PomodoroTomato } from "./pomodoro-tomato";

type Options = { src: string; stateMachines: string; autoplay: boolean; onLoad: () => void };
let created: FakeRive[] = [];
const wasm = vi.fn();
class FakeRive {
  options: Options;
  inputs: RiveInput[] = [
    { name: "etapa", value: 0 },
    { name: "instante", value: false },
  ];
  play = vi.fn();
  pause = vi.fn();
  cleanup = vi.fn();
  resizeDrawingSurfaceToCanvas = vi.fn();
  resizeToCanvas = vi.fn();
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

const played: string[] = [];
class FakeAudio {
  src: string;
  constructor(src: string) {
    this.src = src;
  }
  play() {
    played.push(this.src);
    return Promise.resolve();
  }
}

beforeEach(() => {
  created = [];
  played.length = 0;
  updateAccessibility({ soundEffects: true });
  vi.stubGlobal("Audio", FakeAudio);
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
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

async function load(view: ReturnType<typeof render>) {
  await act(async () => {
    await Promise.resolve();
  });
  const instance = created.at(-1)!;
  act(() => instance.options.onLoad());
  return { instance, root: view.container.firstElementChild as HTMLElement };
}

it("o quadro estático acompanha a fração de tempo restante", () => {
  const view = render(<PomodoroTomato progress={1} />);
  const image = () => view.container.querySelector("img")!;
  expect(image().getAttribute("src")).toBe("/pomodoro-tomato/estagio-0.webp");
  view.rerender(<PomodoroTomato progress={0.5} />);
  expect(image().getAttribute("src")).toBe("/pomodoro-tomato/estagio-4.webp");
  view.rerender(<PomodoroTomato progress={0} />);
  expect(image().getAttribute("src")).toBe("/pomodoro-tomato/estagio-8.webp");
  expect(image().classList.contains("pomodoro-tomato")).toBe(true);
});

it("com movimento reduzido mostra só a imagem da etapa e não baixa o Rive", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const view = render(<AnimatedPomodoroTomato stage={3} />);
  expect(created).toHaveLength(0);
  expect(view.container.querySelector("canvas")).toBeNull();
  expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
    "/pomodoro-tomato/estagio-3.webp",
  );
  expect(view.getByRole("img", { name: "Tomate Pomodoro em papel recortado" })).toBeTruthy();
});

it("carrega o arquivo próprio na máquina Tomate e abre direto na etapa certa, sem repetir mordidas", async () => {
  const view = render(<AnimatedPomodoroTomato stage={5} />);
  expect(view.container.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
  const { instance, root } = await load(view);
  expect(instance.options.src).toBe("/pomodoro-tomato/tomato.riv?v=1");
  expect(instance.options.stateMachines).toBe("Tomate");
  expect(instance.options.autoplay).toBe(false);
  expect(wasm).toHaveBeenCalledWith("/helena-assistant/rive.wasm?v=2.43.0");
  expect(root.getAttribute("data-ready")).toBe("true");
  expect(instance.value("etapa")).toBe(5);
  expect(instance.value("instante")).toBe(true);
  expect(instance.play).toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(150));
  expect(instance.value("instante")).toBe(false);
});

it("uma mordida de cada vez toca a animação; um salto maior pula direto; zero brota de novo", async () => {
  const view = render(<AnimatedPomodoroTomato stage={0} />);
  const { instance } = await load(view);
  act(() => vi.advanceTimersByTime(200));
  view.rerender(<AnimatedPomodoroTomato stage={1} />);
  expect(instance.value("etapa")).toBe(1);
  expect(instance.value("instante")).toBe(false);
  view.rerender(<AnimatedPomodoroTomato stage={2} />);
  expect(instance.value("etapa")).toBe(2);
  expect(instance.value("instante")).toBe(false);
  // abriu a aba depois de muito tempo: pula, sem repetir as mordidas do caminho
  view.rerender(<AnimatedPomodoroTomato stage={6} />);
  expect(instance.value("etapa")).toBe(6);
  expect(instance.value("instante")).toBe(true);
  act(() => vi.advanceTimersByTime(150));
  expect(instance.value("instante")).toBe(false);
  // reinício do ciclo: volta a zero sem pulo, e a máquina faz o tomate brotar
  view.rerender(<AnimatedPomodoroTomato stage={0} />);
  expect(instance.value("etapa")).toBe(0);
  expect(instance.value("instante")).toBe(false);
});

it("expõe a etapa e libera o Rive ao sair da tela", async () => {
  const view = render(<AnimatedPomodoroTomato stage={2} />);
  const { instance, root } = await load(view);
  expect(root.getAttribute("data-stage")).toBe("2");
  view.unmount();
  expect(instance.cleanup).toHaveBeenCalledTimes(1);
});

it("carrega o runtime da janela dona e redimensiona o canvas nessa janela", async () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const container = frame.contentDocument!.createElement("div");
  frame.contentDocument!.body.append(container);
  Object.assign(frame.contentWindow!, { rive: (window as Window & { rive?: unknown }).rive });
  const view = render(<AnimatedPomodoroTomato stage={0} />, { container });
  const target = container.querySelector("canvas")!;
  vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
    width: 200,
    height: 100,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 200,
    bottom: 100,
    toJSON: () => ({}),
  });
  const { instance } = await load(view);
  expect(instance.resizeDrawingSurfaceToCanvas).toHaveBeenCalled();
  view.unmount();
  frame.remove();
});

it("se o arquivo não carrega, a imagem estática continua valendo", async () => {
  const view = render(<AnimatedPomodoroTomato stage={1} />);
  await act(async () => {
    await Promise.resolve();
  });
  const root = view.container.firstElementChild as HTMLElement;
  expect(root.getAttribute("data-ready")).toBe("false");
  expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
    "/pomodoro-tomato/estagio-1.webp",
  );
});

it("ao fim do foco a última mordida fica à mostra antes de o tomate brotar na pausa", () => {
  const { result, rerender } = renderHook(
    ({ phase, remaining }: { phase: "focus" | "shortBreak"; remaining: number }) =>
      useDisplayedTomatoStage(phase, remaining),
    { initialProps: { phase: "focus" as "focus" | "shortBreak", remaining: 0.2 } },
  );
  expect(result.current).toBe(6);
  rerender({ phase: "focus", remaining: 0.01 });
  expect(result.current).toBe(7);
  // o relógio vira para a pausa: o tomate leva a última mordida e fica comido
  rerender({ phase: "shortBreak", remaining: 1 });
  expect(result.current).toBe(8);
  act(() => vi.advanceTimersByTime(2599));
  expect(result.current).toBe(8);
  act(() => vi.advanceTimersByTime(1));
  expect(result.current).toBe(0);
});

it("sem ter chegado ao fim do foco, a pausa mostra o tomate inteiro na hora", () => {
  const { result, rerender } = renderHook(
    ({ phase, remaining }: { phase: "focus" | "shortBreak"; remaining: number }) =>
      useDisplayedTomatoStage(phase, remaining),
    { initialProps: { phase: "focus" as "focus" | "shortBreak", remaining: 0.7 } },
  );
  expect(result.current).toBe(2);
  rerender({ phase: "shortBreak", remaining: 1 });
  expect(result.current).toBe(0);
});

it("cada mordida da sequência toca o som; saltos, volta a zero e a etapa inicial ficam mudos", () => {
  const view = render(<AnimatedPomodoroTomato stage={0} />);
  expect(played).toEqual([]);
  view.rerender(<AnimatedPomodoroTomato stage={1} />);
  expect(played).toEqual(["/pomodoro-tomato/mordida.wav"]);
  view.rerender(<AnimatedPomodoroTomato stage={2} />);
  expect(played).toHaveLength(2);
  view.rerender(<AnimatedPomodoroTomato stage={6} />);
  view.rerender(<AnimatedPomodoroTomato stage={0} />);
  expect(played).toHaveLength(2);
});

it("com os efeitos sonoros desligados nenhuma mordida toca", () => {
  updateAccessibility({ soundEffects: false });
  const view = render(<AnimatedPomodoroTomato stage={0} />);
  view.rerender(<AnimatedPomodoroTomato stage={1} />);
  expect(played).toEqual([]);
});

it("a projeção flutuante anima sem duplicar o som da mordida", () => {
  const main = render(<AnimatedPomodoroTomato stage={0} />);
  const popup = render(<AnimatedPomodoroTomato stage={0} sound={false} />);
  main.rerender(<AnimatedPomodoroTomato stage={1} />);
  popup.rerender(<AnimatedPomodoroTomato stage={1} sound={false} />);
  expect(played).toEqual(["/pomodoro-tomato/mordida.wav"]);
});
