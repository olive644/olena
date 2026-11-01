import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OliverReviewArt } from "./oliver-review-art";
type Options = { src: string; onLoad(): void; onLoadError(): void };
let created: FakeRive[] = [];
class FakeRive {
  input = { name: "clique", value: 0 };
  mouth = { name: "boca", value: 0 };
  play = vi.fn();
  pause = vi.fn();
  cleanup = vi.fn();
  resizeDrawingSurfaceToCanvas = vi.fn();
  constructor(public options: Options) {
    created.push(this);
  }
  stateMachineInputs() {
    return [this.input, this.mouth];
  }
}
beforeEach(() => {
  created = [];
  vi.useFakeTimers();
  delete document.documentElement.dataset["reduceMotion"];
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("rive", {
    Rive: FakeRive,
    Layout: class {},
    Fit: { Contain: "contain" },
    RuntimeLoader: { setWasmUrl: vi.fn() },
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete document.documentElement.dataset["reduceMotion"];
});
it("does not load Rive when reduced motion is requested", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const view = render(<OliverReviewArt cue="1" reaction="explain" label="Oliver" />);
  expect(created).toHaveLength(0);
  expect(view.container.querySelector("canvas")).toBeNull();
  expect(view.getByAltText("Oliver").getAttribute("src")).toBe("/oliver-math-review/oliver.png");
});
it("speaks on its own rig, reacts, pauses hidden and releases the player", async () => {
  const view = render(<OliverReviewArt cue="1" reaction="explain" label="Oliver" />);
  await act(async () => {
    await Promise.resolve();
  });
  const instance = created[0]!;
  expect(instance.options.src).toContain("/oliver-math-review/oliver.riv");
  act(() => instance.options.onLoad());
  expect(view.container.firstElementChild?.getAttribute("data-ready")).toBe("true");
  expect(instance.input.value).toBe(2);
  act(() => vi.advanceTimersByTime(7000));
  expect(instance.input.value).toBe(2);
  view.rerender(<OliverReviewArt cue="2" reaction="correct" label="Oliver" />);
  expect(instance.input.value).toBe(1);
  act(() => vi.advanceTimersByTime(90));
  expect(instance.input.value).toBe(0);
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(instance.pause).toHaveBeenCalled();
  view.unmount();
  expect(instance.cleanup).toHaveBeenCalledOnce();
});
it("keeps the accessible image when the rig fails", async () => {
  const view = render(<OliverReviewArt cue="1" reaction="explain" label="Oliver" />);
  await act(async () => {
    await Promise.resolve();
  });
  act(() => created[0]!.options.onLoadError());
  expect(view.container.firstElementChild?.getAttribute("data-ready")).toBe("false");
  expect(view.getByAltText("Oliver")).toBeTruthy();
});
it("uses discrete mouth poses and returns to the original idle mouth", async () => {
  const view = render(
    <OliverReviewArt
      cue="1"
      reaction="explain"
      label="Oliver"
      speaking
      word={{ index: 1, word: "Vamos", durationMs: 400 }}
    />,
  );
  await act(async () => {
    await Promise.resolve();
  });
  const instance = created[0]!;
  act(() => instance.options.onLoad());
  expect(instance.mouth.value).toBe(2);
  act(() => vi.advanceTimersByTime(260));
  expect(instance.mouth.value).toBe(0);
  view.rerender(
    <OliverReviewArt
      cue="2"
      reaction="retry"
      label="Oliver"
      speaking
      word={{ index: 2, word: "tentar", durationMs: 400 }}
    />,
  );
  expect(instance.mouth.value).toBe(4);
  view.rerender(<OliverReviewArt cue="3" reaction="correct" label="Oliver" speaking={false} />);
  expect(instance.mouth.value).toBe(5);
  act(() => vi.advanceTimersByTime(1800));
  expect(instance.mouth.value).toBe(0);
  view.rerender(<OliverReviewArt cue="4" reaction="explain" label="Oliver" speaking={false} />);
  expect(instance.mouth.value).toBe(0);
});
