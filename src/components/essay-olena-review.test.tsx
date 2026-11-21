import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ESSAY_COMPETENCY_IDS, type EssayReview } from "../ai/essay-output";
import { EssayReviewError } from "../data/essay-olena-client";
import { EssayOlenaReview } from "./essay-olena-review";

const credits = vi.hoisted(() => ({
  usage: { remainingCredits: 400 } as { remainingCredits: number } | undefined,
  prepare: vi.fn(),
  reload: vi.fn(),
}));
vi.mock("../views/use-olena-credits", () => ({ useOlenaCredits: () => credits }));

const essay = `${"A educação é um direito de todos e precisa de atenção. ".repeat(8)}O governo deve ampliar o acesso.`;

const review = (score?: number): EssayReview => ({
  overall: "",
  competencies: ESSAY_COMPETENCY_IDS.map((id, index) => ({
    id,
    level: index === 0 ? "great" : index === 4 ? "needs-work" : "good",
    summary: "",
    notes: [],
    ...(score === undefined ? {} : { score: score as 120 }),
  })),
});

beforeEach(() => {
  credits.usage = { remainingCredits: 400 };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("comentários da Olena na redação", () => {
  it("não envia nada antes do toque e avisa o custo, o saldo e a privacidade", () => {
    const requester = vi.fn();
    render(<EssayOlenaReview text={essay} topicTitle="Educação" requester={requester} />);
    expect(requester).not.toHaveBeenCalled();
    expect(screen.getByText(/Nada é enviado antes do seu toque/)).toBeTruthy();
    expect(screen.getByText(/Custo estimado: até \d+ créditos/)).toBeTruthy();
    expect(screen.getByText("Seu saldo de hoje: 400 créditos.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Política de Privacidade" })).toBeTruthy();
  });

  it("mostra os cinco níveis e trava as observações com EM BREVE OLENA PRO", async () => {
    const requester = vi.fn(async () => review());
    render(<EssayOlenaReview text={essay} topicTitle="Educação" requester={requester} />);
    fireEvent.click(screen.getByRole("button", { name: "Pedir nota da Olena" }));
    await waitFor(() =>
      expect(screen.getByText(/A nota geral ainda não está liberada/)).toBeTruthy(),
    );
    expect(requester).toHaveBeenCalledWith(essay, "Educação");
    expect(document.querySelectorAll(".essay-olena-levels > li")).toHaveLength(5);
    expect(screen.getByText("Precisa melhorar", { exact: false })).toBeTruthy();
    // Sem comentários: nenhuma sanfona de observações, só o aviso de que vem no Olena Pro.
    expect(document.querySelectorAll("details")).toHaveLength(0);
    expect(document.querySelector(".essay-olena-locked")?.textContent).toContain(
      "EM BREVE OLENA PRO",
    );
    expect(screen.getByText(/pode variar da correção oficial do Enem/)).toBeTruthy();
    expect(credits.prepare).toHaveBeenCalled();
    expect(credits.reload).toHaveBeenCalled();
  });

  it("com a chave da nota desligada não mostra número; com ela, mostra como estimativa", async () => {
    const { unmount } = render(<EssayOlenaReview text={essay} requester={async () => review()} />);
    fireEvent.click(screen.getByRole("button", { name: "Pedir nota da Olena" }));
    await waitFor(() => screen.getByText(/A nota geral ainda não está liberada/));
    expect(screen.queryByText(/Nota estimada pela IA/)).toBeNull();
    unmount();
    render(<EssayOlenaReview text={essay} requester={async () => review(120)} />);
    fireEvent.click(screen.getByRole("button", { name: "Pedir nota da Olena" }));
    await waitFor(() =>
      screen.getByText(/Nota estimada pela IA: 600 de 1000\. Não é a nota oficial/),
    );
  });

  it("bloqueia com texto curto demais e com saldo zero, sem chamar a Olena", () => {
    const requester = vi.fn();
    const { rerender } = render(<EssayOlenaReview text="Texto curto." requester={requester} />);
    const button = screen.getByRole("button", { name: "Pedir nota da Olena" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(requester).not.toHaveBeenCalled();
    credits.usage = { remainingCredits: 0 };
    rerender(<EssayOlenaReview text={essay} requester={requester} />);
    expect(screen.getByRole("alert").textContent).toContain("Sem créditos hoje");
    expect(
      (screen.getByRole("button", { name: "Pedir nota da Olena" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("mostra o erro e deixa pedir de novo (sem login, limite, falha)", async () => {
    const requester = vi
      .fn()
      .mockRejectedValueOnce(
        new EssayReviewError("signed-out", "Entre na sua conta para pedir comentários da Olena."),
      )
      .mockRejectedValueOnce(new Error("rede"))
      .mockResolvedValueOnce(review());
    render(<EssayOlenaReview text={essay} requester={requester} />);
    const ask = () => fireEvent.click(screen.getByRole("button", { name: /Pedir/ }));
    ask();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Entre na sua conta"),
    );
    ask();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("não gasta créditos"),
    );
    ask();
    await waitFor(() => screen.getByText(/EM BREVE OLENA PRO/, { selector: ".visually-hidden" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("avisa quando o texto mudou depois dos comentários", async () => {
    const requester = vi.fn(async () => review());
    const { rerender } = render(<EssayOlenaReview text={essay} requester={requester} />);
    fireEvent.click(screen.getByRole("button", { name: "Pedir nota da Olena" }));
    await waitFor(() => screen.getByText(/EM BREVE OLENA PRO/, { selector: ".visually-hidden" }));
    rerender(<EssayOlenaReview text={`${essay} Mais uma frase.`} requester={requester} />);
    expect(screen.getByText(/O texto mudou depois desta nota/)).toBeTruthy();
  });

  it("copia a avaliação sem o texto da redação", async () => {
    const writeText = vi.fn(async (_text: string) => undefined);
    Object.assign(navigator, { clipboard: { writeText }, share: undefined });
    render(<EssayOlenaReview text={essay} requester={async () => review()} />);
    fireEvent.click(screen.getByRole("button", { name: "Pedir nota da Olena" }));
    await waitFor(() => screen.getByText(/EM BREVE OLENA PRO/, { selector: ".visually-hidden" }));
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
    await waitFor(() => screen.getByText("Avaliação copiada."));
    const shared = writeText.mock.calls[0]?.[0] ?? "";
    expect(shared).toContain("não é a nota oficial do Enem");
    expect(shared).toContain("C1: Muito bom");
    expect(shared).not.toContain("O governo deve ampliar o acesso");
  });

  it("guarda o relato só com categoria e data, sem o texto", async () => {
    localStorage.clear();
    render(<EssayOlenaReview text={essay} requester={async () => review()} />);
    fireEvent.click(screen.getByRole("button", { name: "Pedir nota da Olena" }));
    await waitFor(() => screen.getByText(/EM BREVE OLENA PRO/, { selector: ".visually-hidden" }));
    fireEvent.click(screen.getByRole("button", { name: "Reportar um problema" }));
    fireEvent.click(screen.getByLabelText("A nota parece errada"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar relato" }));
    const saved = JSON.parse(localStorage.getItem("helena.essayReports.v1") ?? "[]") as Record<
      string,
      string
    >[];
    expect(saved).toHaveLength(1);
    expect(Object.keys(saved[0]!).sort()).toEqual(["at", "category"]);
    expect(saved[0]!["category"]).toBe("A nota parece errada");
    expect(JSON.stringify(saved)).not.toContain("educação");
  });
});
