import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { EnemQuestionExplanation } from "./enem-question-explanation";
import initial from "../../public/enem/reviews/6ded5b936961cb.json";

const load = vi.hoisted(() => vi.fn());
vi.mock("../data/enem-question-review", async (original) => ({
  ...(await original<typeof import("../data/enem-question-review")>()),
  loadQuestionReviewBundle: load,
}));
beforeEach(() => load.mockReset());
const props = {
  variantId: initial.variantId,
  paperUrl: "/enem-pdf/2026.pdf",
  questionKey: "english:1",
  officialAnswer: "B",
  selected: "C",
};

it("mostra resolução salva, justificativas e gráficos dos dados correspondentes", async () => {
  const statistics = {
    population: 100,
    counts: { A: 10, B: 56, C: 14, D: 5, E: 10, blank: 5 },
    source: {
      title: "Microdados de teste",
      url: "https://www.gov.br/inep",
      processedAt: "2026-11-22",
      scope: "Amostra sintética apenas deste teste",
    },
  };
  load.mockResolvedValue({
    questions: { "english:1": { ...initial.questions["english:1"], statistics } },
  });
  render(<EnemQuestionExplanation {...props} />);
  await screen.findByText(initial.questions["english:1"].solution.paragraphs[0]!);
  expect(screen.getByText(initial.questions["english:1"].solution.alternatives.C)).toBeTruthy();
  expect(screen.getByRole("img", { name: /56%.*de acerto/ })).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Adir Ferreira/ })).toBeNull();
  expect(screen.queryByText(/Conferida com gabarito|Produzida com IA|Referências:/)).toBeNull();
  expect(screen.getByText("Média")).toBeTruthy();
});

it("não mostra conteúdo de outra resposta oficial e não inventa estatísticas", async () => {
  load.mockResolvedValue({ questions: initial.questions });
  render(<EnemQuestionExplanation {...props} officialAnswer="D" />);
  await screen.findByText("Esta questão ainda não possui uma resolução conferida na base salva.");
  expect(screen.queryByText(initial.questions["english:1"].solution.paragraphs[0]!)).toBeNull();
  expect(screen.queryByRole("img", { name: /de acerto/ })).toBeNull();
});

it("oferece nova tentativa quando a base falha", async () => {
  load.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(null);
  render(<EnemQuestionExplanation {...props} />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});

it("preserva a distribuição de uma questão anulada sem atribuir acerto ou dificuldade", async () => {
  load.mockResolvedValue({
    questions: {
      "english:1": {
        answer: "ANULADA",
        statistics: {
          population: 10,
          counts: { A: 2, B: 2, C: 2, D: 2, E: 1, blank: 1 },
          source: {
            title: "INEP",
            url: "https://www.gov.br/inep",
            processedAt: "2026-11-22",
            scope: "Dados sintéticos de teste",
          },
        },
      },
    },
  });
  render(<EnemQuestionExplanation {...props} officialAnswer="ANULADA" />);
  await screen.findByText("Questão anulada. Taxa de acerto e dificuldade não se aplicam.");
  expect(screen.getByRole("img", { name: /Distribuição das respostas:/ })).toBeTruthy();
  expect(screen.queryByRole("img", { name: /de acerto entre/ })).toBeNull();
  expect(screen.queryByText("Sua resposta · incorreta")).toBeNull();
});
