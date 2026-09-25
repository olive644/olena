import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { HandwritingDocument } from "../domain/handwriting";
import { HandwritingStudio } from "./handwriting-studio";

function documentWith(...ids: string[]): HandwritingDocument {
  return {
    version: 1,
    paper: "ruled",
    strokes: ids.map((id, index) => ({
      id,
      tool: "pen" as const,
      brush: "fine" as const,
      color: "#17151c",
      width: 4,
      points: Array.from({ length: 12 }, (_, point) => ({
        x: 100 + point * 30,
        y: 200 + index * 40,
        pressure: 0.5,
      })),
    })),
    stickies: [],
  } as unknown as HandwritingDocument;
}

function props(overrides: Record<string, unknown> = {}) {
  return { onClose: vi.fn(), onSave: vi.fn(), draftKey: "remote-test", ...overrides };
}

let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  localStorage.clear();
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("aplica os traços de um colega e começa a animá-los", () => {
  const onDraftChange = vi.fn();
  const view = render(
    <HandwritingStudio {...props({ onDraftChange, remoteDocument: documentWith("a") })} />,
  );
  frames = [];
  view.rerender(
    <HandwritingStudio
      {...props({
        onDraftChange,
        remoteDocument: documentWith("a", "b"),
        remoteAuthor: "Bia",
      })}
    />,
  );
  const latest = onDraftChange.mock.calls.at(-1)?.[0] as HandwritingDocument;
  expect(latest.strokes.map((stroke) => stroke.id)).toEqual(["a", "b"]);
  // A animação foi agendada: um quadro pendente para escrever o traço novo.
  expect(frames.length).toBeGreaterThan(0);
});

it("não anima a primeira carga do documento, que chega sem autor", () => {
  render(<HandwritingStudio {...props({ remoteDocument: documentWith("a", "b") })} />);
  expect(frames).toHaveLength(0);
});

it("respeita a preferência de reduzir movimento", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  const view = render(<HandwritingStudio {...props({ remoteDocument: documentWith("a") })} />);
  frames = [];
  view.rerender(
    <HandwritingStudio
      {...props({ remoteDocument: documentWith("a", "b"), remoteAuthor: "Bia" })}
    />,
  );
  expect(frames).toHaveLength(0);
});

it("não anima um lote grande de traços", () => {
  const view = render(<HandwritingStudio {...props({ remoteDocument: documentWith("a") })} />);
  frames = [];
  const many = Array.from({ length: 20 }, (_, index) => `n${index}`);
  view.rerender(
    <HandwritingStudio
      {...props({ remoteDocument: documentWith("a", ...many), remoteAuthor: "Bia" })}
    />,
  );
  expect(frames).toHaveLength(0);
});

it("um traço em andamento sobrevive a uma atualização de colega no meio do gesto", () => {
  const onDraftChange = vi.fn();
  const view = render(
    <HandwritingStudio {...props({ onDraftChange, remoteDocument: documentWith("a") })} />,
  );
  const canvas = view.container.querySelector<HTMLCanvasElement>(".handwriting-canvas")!;
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 600,
    height: 800,
    right: 600,
    bottom: 800,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  canvas.setPointerCapture = vi.fn();
  canvas.hasPointerCapture = vi.fn(() => true);
  canvas.releasePointerCapture = vi.fn();
  const pointer = { pointerId: 7, pointerType: "mouse", button: 0, pressure: 0.5 };

  // A pessoa começa um traço; antes de soltar a caneta chega uma atualização do colega.
  fireEvent.pointerDown(canvas, { ...pointer, clientX: 100, clientY: 100, buttons: 1 });
  fireEvent.pointerMove(canvas, { ...pointer, clientX: 130, clientY: 110, buttons: 1 });
  view.rerender(
    <HandwritingStudio
      {...props({
        onDraftChange,
        remoteDocument: documentWith("a", "b"),
        remoteAuthor: "Bia",
      })}
    />,
  );
  // Durante o gesto o traço ainda não está na lista: a atualização traz só os do colega.
  const during = onDraftChange.mock.calls.at(-1)?.[0] as HandwritingDocument;
  expect(during.strokes.map((stroke) => stroke.id)).toEqual(["a", "b"]);

  fireEvent.pointerMove(canvas, { ...pointer, clientX: 180, clientY: 130, buttons: 1 });
  fireEvent.pointerUp(canvas, { ...pointer, clientX: 180, clientY: 130 });
  const after = onDraftChange.mock.calls.at(-1)?.[0] as HandwritingDocument;
  expect(after.strokes).toHaveLength(3);
  const mine = after.strokes.at(-1)!;
  expect(["a", "b"]).not.toContain(mine.id);
  expect(mine.points.length).toBeGreaterThan(1);
});
