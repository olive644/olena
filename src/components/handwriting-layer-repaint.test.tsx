import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { HandwritingDocument } from "../domain/handwriting";

const paint = vi.hoisted(() => vi.fn());
vi.mock("./handwriting-page-scene", () => ({ renderPageScene: paint }));
import { HandwritingStudio } from "./handwriting-studio";

beforeEach(() => {
  paint.mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

function editCreatedText(container: HTMLElement) {
  const canvas = container.querySelector(".handwriting-canvas") as HTMLCanvasElement;
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1200,
    bottom: 1600,
    width: 1200,
    height: 1600,
    toJSON: () => ({}),
  });
  fireEvent.doubleClick(canvas, {
    clientX: (290 * 1200) / Number(canvas.dataset["pageWidth"]),
    clientY: (270 * 1600) / Number(canvas.dataset["pageHeight"]),
  });
}

it("texto novo nasce com seleção global, igual a post-it e tabela", () => {
  const { container } = render(
    <HandwritingStudio draftKey="text-global-first-frame" onClose={vi.fn()} onSave={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Texto na página inteira" }));
  expect(
    (screen.getByRole("textbox", { name: "Texto na folha" }) as HTMLTextAreaElement).readOnly,
  ).toBe(true);
  expect(container.querySelector(".handwriting-selection-float")).not.toBeNull();
  expect(container.querySelector(".handwriting-studio")?.getAttribute("data-tool")).toBe("select");
});

it("não restaura ações antigas durante a edição do texto", () => {
  const { container } = render(
    <HandwritingStudio draftKey="no-legacy-actions" onClose={vi.fn()} onSave={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Texto na página inteira" }));
  editCreatedText(container);
  expect(container.querySelectorAll(".handwriting-selection-actions > button")).toHaveLength(0);
  expect(screen.queryByRole("button", { name: "Copiar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Recortar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Duplicar" })).toBeNull();
});

const document: HandwritingDocument = {
  version: 1,
  paper: "dots",
  strokes: [
    {
      id: "ink",
      tool: "pen",
      color: "#17151c",
      width: 4,
      points: [{ x: 100, y: 100, pressure: 0.5 }],
    },
  ],
  stickies: [{ id: "text", kind: "text", x: 200, y: 200, text: "Texto original", color: "yellow" }],
};

it.each(["Retângulo", "Laço livre", "Selecionar tudo"])(
  "ativa seleção global imediatamente ao escolher %s durante edição",
  (name) => {
    const { container } = render(
      <HandwritingStudio
        draftKey={"editing-to-select-" + name}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Texto na página inteira" }));
    editCreatedText(container);
    const input = screen.getByRole("textbox", { name: "Texto na folha" }) as HTMLTextAreaElement;
    expect(input.readOnly).toBe(false);
    fireEvent.click(screen.getByRole("button", { name }));
    expect(input.readOnly).toBe(true);
    expect(container.querySelector(".handwriting-studio")?.getAttribute("data-tool")).toBe(
      "select",
    );
    expect(container.querySelector(".handwriting-selection-float")).not.toBeNull();
    expect(
      container.querySelectorAll(".handwriting-sticky__resize, .handwriting-sticky__menu-trigger"),
    ).toHaveLength(0);
  },
);

it("editar o texto do componente preserva o papel e a tinta já desenhados", () => {
  render(
    <HandwritingStudio
      initialDocument={document}
      draftKey="repaint-text"
      onClose={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  paint.mockClear();
  fireEvent.change(screen.getByRole("textbox", { name: "Texto na folha" }), {
    target: { value: "Texto alterado" },
  });
  expect(paint).not.toHaveBeenCalled();
});

it("mudar a cor da tinta repinta somente os traços", () => {
  render(
    <HandwritingStudio
      initialDocument={document}
      draftKey="repaint-ink"
      onClose={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Selecionar traços" }));
  fireEvent.click(screen.getByRole("button", { name: "Selecionar tudo" }));
  paint.mockClear();
  fireEvent.change(screen.getByLabelText("Cor do traço selecionado"), {
    target: { value: "#218570" },
  });
  expect(paint).toHaveBeenCalledOnce();
  expect(paint.mock.calls[0]?.[2]).toMatchObject({ onlyLayer: "strokes" });
});

it("o texto legado libera o clique para selecionar e entra em edição pelo duplo clique", () => {
  const { container } = render(
    <HandwritingStudio
      initialDocument={{
        ...document,
        pageText: "Texto legado",
        pageTextFrame: { x: 100, y: 80, width: 300, height: 200 },
      }}
      draftKey="legacy-selection"
      onClose={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Selecionar traços" }));
  expect(
    (container.querySelector(".handwriting-legacy-text-target") as HTMLElement).style.pointerEvents,
  ).toBe("none");
  const canvas = container.querySelector(".handwriting-canvas") as HTMLCanvasElement;
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1200,
    bottom: 1600,
    width: 1200,
    height: 1600,
    toJSON: () => ({}),
  });
  fireEvent.doubleClick(canvas, { clientX: 150, clientY: 100 });
  expect(screen.getByRole("textbox", { name: "Texto da página inteira" })).toBeTruthy();
});
