import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EnemSection } from "../data/enem-sections";
import { EnemSubmissionResult } from "./enem-submission-result";

const tri = vi.hoisted(() => ({
  load: vi.fn(),
  calculate: vi.fn(() => ({ score: 304.4, theta: -1.81 })),
}));
vi.mock("../data/enem-tri", () => ({
  loadEnemTriBundle: tri.load,
  calculateEnemTri: tri.calculate,
}));
vi.mock("../data/enem-answer-key", () => ({ loadEnemAnswerKey: vi.fn(async () => ({})) }));

const section: EnemSection = { id: "languages", label: "Linguagens", question: 1, color: "#fff" };
const render1 = () =>
  render(
    <EnemSubmissionResult
      title="Enem 2025"
      section={section}
      seconds={3}
      answers={{}}
      onClose={() => {}}
      variantId={"a".repeat(14)}
      paperUrl="/enem-pdf/x.pdf"
      language="english"
    />,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("pontuação estimada do Enem", () => {
  it("mostra 'Indisponível nesta edição' quando a prova não tem parâmetros da TRI (2010, 2026)", async () => {
    tri.load.mockResolvedValue(null);
    render1();
    await waitFor(() => expect(screen.getByText("Indisponível nesta edição")).toBeTruthy());
    expect(tri.calculate).not.toHaveBeenCalled();
  });

  it("mostra a nota calculada quando há parâmetros, e o texto de ajuda não fala em modelo treinado", async () => {
    tri.load.mockResolvedValue({ items: [] });
    const { container } = render1();
    await waitFor(() => expect(tri.calculate).toHaveBeenCalled());
    await waitFor(() => expect(container.textContent).toContain("Pontuação estimada"));
    expect(container.textContent).toContain("modelo da TRI");
    expect(container.textContent).not.toContain("modelo treinado");
  });
});
