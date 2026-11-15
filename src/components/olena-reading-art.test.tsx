import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OlenaReadingArt } from "./olena-reading-art";

type Options = { src: string; stateMachines: string; onLoad: () => void };
let created: FakeRive[] = [];
class FakeRive {
  options: Options;
  play = vi.fn();
  pause = vi.fn();
  cleanup = vi.fn();
  resizeDrawingSurfaceToCanvas = vi.fn();
  constructor(options: Options) {
    this.options = options;
    created.push(this);
  }
}

const art = {
  src: "/helena-onboarding-step-1-cutout.webp",
  width: 640,
  height: 640,
  className: "onboarding__helena",
};

beforeEach(() => {
  created = [];
  vi.stubGlobal("rive", {
    Rive: FakeRive,
    Layout: class {},
    Fit: { Contain: "contain" },
    RuntimeLoader: { setWasmUrl: vi.fn() },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("anima a Olena lendo com o arquivo e a máquina de estados certos e troca a imagem ao carregar", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const view = render(<OlenaReadingArt {...art} alt="Olena" />);
  await act(async () => {});
  expect(created).toHaveLength(1);
  const rive = created[0]!;
  expect(rive.options.src).toMatch(/^\/olena-reading\/olena\.riv/);
  expect(rive.options.stateMachines).toBe("Olena");
  const wrapper = view.container.querySelector(".onboarding__helena")!;
  expect(wrapper.getAttribute("data-ready")).toBe("false");
  act(() => rive.options.onLoad());
  expect(rive.play).toHaveBeenCalled();
  expect(wrapper.getAttribute("data-ready")).toBe("true");
  expect(wrapper.getAttribute("role")).toBe("img");
  expect(wrapper.getAttribute("aria-label")).toBe("Olena");
  expect(wrapper.querySelector("img")?.getAttribute("src")).toBe(art.src);
  view.unmount();
  expect(rive.cleanup).toHaveBeenCalled();
});

it("sem texto alternativo a arte é só decorativa", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const view = render(<OlenaReadingArt {...art} />);
  await act(async () => {});
  const wrapper = view.container.querySelector(".onboarding__helena")!;
  expect(wrapper.getAttribute("aria-hidden")).toBe("true");
  expect(wrapper.getAttribute("role")).toBeNull();
});

it("com movimento reduzido fica só a imagem, sem carregar o Rive", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const view = render(<OlenaReadingArt {...art} />);
  await act(async () => {});
  expect(created).toHaveLength(0);
  expect(view.container.querySelector("canvas")).toBeNull();
  expect(view.container.querySelector("img")).not.toBeNull();
});
