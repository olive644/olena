import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NotebookJourney } from "./notebook-journey";

vi.mock("./notebook-cover", () => ({ NotebookCover: () => <div /> }));
vi.mock("./notebook-back-cover", () => ({ NotebookBackCover: () => <div /> }));
vi.mock("../data/accessibility-preferences", () => ({ isMotionReduced: () => false }));

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  Reflect.deleteProperty(Element.prototype, "animate");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([
  [false, "front"],
  [true, "front"],
  [false, "back"],
  [true, "back"],
] as const)("a capa usa transform sem criar sombras, retorno=%s lado=%s", (returning, side) => {
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const calls: { node: HTMLElement; frames: Keyframe[]; timing: KeyframeAnimationOptions }[] = [];
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    value: vi.fn(function (
      this: HTMLElement,
      frames: Keyframe[],
      timing: KeyframeAnimationOptions,
    ) {
      calls.push({
        node: this,
        frames: frames as Keyframe[],
        timing: timing as KeyframeAnimationOptions,
      });
      return { finished: new Promise(() => {}), cancel: vi.fn() } as unknown as Animation;
    }),
  });
  document.body.innerHTML =
    '<div class="notebook-spread-shell" style="width:400px;height:300px"><div class="notebook-paper-spread"></div></div>';
  const target = document.querySelector<HTMLElement>(".notebook-spread-shell")!;
  target.getBoundingClientRect = () => new DOMRect(0, 0, 400, 300);
  const onDone = vi.fn();
  const view = render(
    <NotebookJourney
      journey={{
        notebook: {
          id: "book",
          title: "Caderno",
          subjectId: "subject",
          createdAt: "2026-01-01",
          pageIds: [],
        },
        tabs: [],
        from: { x: 0, y: 0, width: 200, height: 300 },
        returning,
        destination: returning ? "cover" : "spread",
        side,
      }}
      onDone={onDone}
    />,
  );
  // Ao voltar para a capa, o destino tem o mesmo contrato de geometria.
  if (returning) {
    view.unmount();
    calls.length = 0;
    target.className = "notebook-concept-cover";
    target.innerHTML = '<div class="book-cover"></div>';
    render(
      <NotebookJourney
        journey={{
          notebook: {
            id: "book",
            title: "Caderno",
            subjectId: "subject",
            createdAt: "2026-01-01",
            pageIds: [],
          },
          tabs: [],
          from: { x: 0, y: 0, width: 200, height: 300 },
          returning,
          destination: "cover",
          side,
        }}
        onDone={onDone}
      />,
    );
  }
  act(() => frame?.(0));
  const leaf = calls.find(({ node }) => node.classList.contains("notebook-journey-leaf"))!;
  expect(leaf.frames).toHaveLength(17);
  expect(leaf.frames[0]?.["transform"]).toContain(
    returning ? String(side === "back" ? Math.PI : -Math.PI) : "rotateY(0rad)",
  );
  expect(leaf.frames.at(-1)?.["transform"]).toContain(
    returning ? "rotateY(0rad)" : String(side === "back" ? Math.PI : -Math.PI),
  );
  expect(calls.some(({ frames }) => frames.some((keyframe) => "--cover-angle" in keyframe))).toBe(
    false,
  );
  expect(
    calls.filter(({ node }) => node.classList.contains("notebook-journey-shade")),
  ).toHaveLength(0);
  expect(document.querySelector(".notebook-journey-marks")?.childElementCount).toBe(0);
});
