import { useReducer, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createInitialWorkspace, workspaceReducer } from "../domain/workspace";
import { EnemEssayWriting } from "./enem-essay-writing";
import { EnemEssayPrompt } from "./enem-essay-prompt";

const pdf = vi.hoisted(() => ({ render: vi.fn(), getPage: vi.fn(), destroy: vi.fn() }));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "/pdf.worker.mjs" }));
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({
    promise: Promise.resolve({ numPages: 4, getPage: pdf.getPage }),
    destroy: pdf.destroy,
  }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function preparePdf() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }),
  );
  pdf.render.mockReturnValue({ promise: Promise.resolve(), cancel: vi.fn() });
  pdf.getPage.mockImplementation(async (number: number) => ({
    getTextContent: async () => ({
      items: [{ str: number === 3 ? "TEXTOS MOTIVADORES PROPOSTA DE REDAÇÃO" : "Questão 46" }],
    }),
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
    render: (options: unknown) => pdf.render(number, options),
  }));
}
it("localiza a proposta e renderiza somente sua página, sem questões ou navegação da prova", async () => {
  preparePdf();
  render(<EnemEssayPrompt year={2021} paperUrl="/essay-prompt-test.pdf" />);
  await waitFor(() => expect(pdf.render).toHaveBeenCalledTimes(1));
  expect(pdf.render.mock.calls[0]?.[0]).toBe(3);
  expect(document.querySelectorAll("canvas")).toHaveLength(1);
  expect(screen.queryByText("Questão 46")).toBeNull();
  expect(screen.queryByRole("button", { name: /Próxima página/ })).toBeNull();
});
it("reutiliza o editor, recupera o rascunho do workspace e entrega o texto pelo callback", async () => {
  preparePdf();
  const submitted = vi.fn();
  function Host() {
    const [workspace, dispatch] = useReducer(workspaceReducer, createInitialWorkspace());
    const [open, setOpen] = useState(true);
    return open ? (
      <EnemEssayWriting
        year={2022}
        paperUrl="/essay-editor-test.pdf"
        variantId="blue"
        scope="account"
        workspace={workspace}
        dispatch={dispatch}
        collectionId="machine"
        onClose={() => setOpen(false)}
        onSubmit={submitted}
      />
    ) : (
      <button onClick={() => setOpen(true)}>Reabrir</button>
    );
  }
  render(<Host />);
  const input = screen.getByRole("textbox", { name: "Sua redação" });
  fireEvent.change(input, { target: { value: "Minha tese e seus argumentos." } });
  fireEvent.click(screen.getByRole("button", { name: "Voltar às propostas" }));
  fireEvent.click(screen.getByRole("button", { name: "Reabrir" }));
  expect(screen.getByRole("textbox", { name: "Sua redação" })).toHaveProperty(
    "value",
    "Minha tese e seus argumentos.",
  );
  expect(screen.queryByText("Texto de apoio autoral Olena")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Entregar redação" }));
  expect(submitted).toHaveBeenCalledWith({
    text: "Minha tese e seus argumentos.",
    elapsedSeconds: expect.any(Number),
  });
  expect(screen.getByRole("heading", { name: "Redação entregue!" })).toBeTruthy();
});
