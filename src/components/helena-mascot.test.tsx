import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HelenaMascot } from "./helena-mascot";

const props = { open: false, motion: "idle", tilt: { x: 0, y: 0 }, hover: false };
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("does not load a graphic frame with reduced motion and keeps the correct static pose", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const view = render(<HelenaMascot {...props} />);
  expect(view.container.querySelector("iframe")).toBeNull();
  expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
    "/helena-assistant/star.png",
  );
  view.rerender(<HelenaMascot {...props} open />);
  expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
    "/helena-assistant/helena.png",
  );
});
it("rejects spoofed ready messages and sends only visual state to the owned frame", () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const view = render(<HelenaMascot {...props} />);
  act(() => vi.advanceTimersByTime(1500));
  const frame = view.container.querySelector("iframe")!;
  const post = vi.spyOn(frame.contentWindow!, "postMessage");
  fireEvent.load(frame);
  expect(post).toHaveBeenCalledWith(
    expect.objectContaining({ type: "helena-state", open: false }),
    window.location.origin,
  );
  act(() =>
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://other.example",
        source: frame.contentWindow,
        data: { type: "helena-ready", ready: true },
      }),
    ),
  );
  expect(view.container.firstElementChild?.getAttribute("data-ready")).toBe("false");
  act(() =>
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        source: window,
        data: { type: "helena-ready", ready: true },
      }),
    ),
  );
  expect(view.container.firstElementChild?.getAttribute("data-ready")).toBe("false");
  act(() =>
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        source: frame.contentWindow,
        data: { type: "helena-ready", ready: true },
      }),
    ),
  );
  expect(view.container.firstElementChild?.getAttribute("data-ready")).toBe("true");
  view.rerender(<HelenaMascot {...props} motion="dragging" tilt={{ x: 9, y: 18 }} />);
  const message = post.mock.calls.at(-1)?.[0] as Record<string, unknown>;
  expect(message["motion"]).toBe("dragging");
  expect(message["x"]).toBe(1);
  expect(Object.keys(message).sort()).toEqual([
    "hover",
    "motion",
    "open",
    "reduced",
    "type",
    "visible",
    "x",
    "y",
  ]);
});

it("yields rendering to other screens and resumes after their interaction", () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const view = render(<HelenaMascot {...props} />);
  act(() => vi.advanceTimersByTime(1500));
  const frame = view.container.querySelector("iframe")!;
  const post = vi.spyOn(frame.contentWindow!, "postMessage");
  const other = document.createElement("button");
  document.body.append(other);
  try {
    fireEvent.pointerDown(other);
    expect(post.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ visible: false }));
    act(() => vi.advanceTimersByTime(1499));
    expect(post.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ visible: false }));
    act(() => vi.advanceTimersByTime(1));
    expect(post.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ visible: true }));
  } finally {
    other.remove();
  }
});

it("keeps rendering while the mobile chat is open and starts the return during closing", () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("innerWidth", 390);
  const view = render(<HelenaMascot {...props} open />);
  act(() => vi.advanceTimersByTime(1500));
  const frame = view.container.querySelector("iframe")!;
  const post = vi.spyOn(frame.contentWindow!, "postMessage");
  fireEvent.load(frame);
  expect(post.mock.calls.at(-1)?.[0]).toEqual(
    expect.objectContaining({ open: true, visible: true }),
  );
  view.rerender(<HelenaMascot {...props} motion="closing" />);
  expect(view.container.querySelector("iframe")).toBe(frame);
  expect(post.mock.calls.at(-1)?.[0]).toEqual(
    expect.objectContaining({ open: false, visible: true }),
  );
});
