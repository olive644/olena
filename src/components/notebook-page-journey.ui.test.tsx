import { cleanup, render, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NotebookPageJourney } from "./notebook-page-journey";
const originalAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "animate");

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (originalAnimate) Object.defineProperty(HTMLElement.prototype, "animate", originalAnimate);
  else Reflect.deleteProperty(HTMLElement.prototype, "animate");
});

it("desmontar a viagem limpa a camada sem concluir a tela antiga", () => {
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn().mockReturnValue({ finished: new Promise(() => {}), cancel: vi.fn() }),
  });
  const { done, view } = setup();
  view.unmount();
  act(() => vi.advanceTimersByTime(4000));
  expect(done).not.toHaveBeenCalled();
  expect(document.documentElement.classList.contains("notebook-page-entering")).toBe(false);
});
function setup(reduced = false) {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: reduced }));
  document.body.innerHTML =
    '<div class="handwriting-viewport"><canvas class="handwriting-canvas"></canvas></div>';
  const paper = document.createElement("div");
  const done = vi.fn();
  const view = render(
    <NotebookPageJourney
      journey={{
        from: { x: 0, y: 0, width: 100, height: 100 },
        paper,
        background: { element: paper, x: 0, y: 0, width: 100, height: 100 },
      }}
      onDone={done}
    />,
  );
  return { done, view };
}
it("respeita movimento reduzido e libera o editor sem iniciar animação", () => {
  const animate = vi.fn();
  vi.stubGlobal("Animation", class {});
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
  const { done } = setup(true);
  expect(animate).not.toHaveBeenCalled();
  expect(done).toHaveBeenCalledTimes(1);
  expect(document.documentElement.classList.contains("notebook-page-entering")).toBe(false);
});
it("o limite de espera permanece ativo mesmo depois de iniciar a animação", () => {
  const cancel = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn().mockReturnValue({ finished: new Promise(() => {}), cancel }),
  });
  const { done } = setup();
  act(() => vi.advanceTimersByTime(4000));
  expect(done).toHaveBeenCalledTimes(1);
  expect(cancel).toHaveBeenCalled();
  expect(document.documentElement.classList.contains("notebook-page-entering")).toBe(false);
});
it("uma falha ao criar a animação não mantém o editor escondido", () => {
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn(() => {
      throw new Error("animation unavailable");
    }),
  });
  const { done } = setup();
  act(() => vi.advanceTimersByTime(30));
  expect(done).toHaveBeenCalledTimes(1);
  expect(document.documentElement.classList.contains("notebook-page-entering")).toBe(false);
});

it("cancelamento inesperado da promessa de animação libera o editor uma única vez", async () => {
  let first = true;
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn(() => {
      const finished = first ? Promise.reject(new Error("animation cancelled")) : Promise.resolve();
      first = false;
      return { finished, cancel: vi.fn() };
    }),
  });
  const { done } = setup();
  await act(async () => {
    vi.advanceTimersByTime(30);
    await Promise.resolve();
  });
  expect(done).toHaveBeenCalledTimes(1);
  expect(document.documentElement.classList.contains("notebook-page-entering")).toBe(false);
  act(() => vi.advanceTimersByTime(4000));
  expect(done).toHaveBeenCalledTimes(1);
});
