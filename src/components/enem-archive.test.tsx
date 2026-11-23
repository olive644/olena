import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import catalog from "../../public/enem/catalog.json";
import EnemArchive from "./enem-archive";
import { loadEnemCatalog } from "../data/enem-catalog";
const audio = vi.hoisted(() => ({ unlock: vi.fn(), play: vi.fn(), dispose: vi.fn() }));
vi.mock("../data/math-sound", () => ({ createMathSound: () => audio }));

beforeEach(() => {
  localStorage.clear();
  // O catálogo vem do servidor (fora do JavaScript): o teste serve o mesmo arquivo.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(catalog), { status: 200 })),
  );
});

async function openArchive(scope: string) {
  const view = render(<EnemArchive scope={scope} onBack={vi.fn()} />);
  await act(async () => {
    await loadEnemCatalog();
  });
  return view;
}
it("cobre 2010 a 2026 com dois dias e usa arquivos oficiais", () => {
  expect(catalog.papers).toHaveLength(34);
  for (let year = 2010; year <= 2026; year++)
    for (const day of [1, 2]) {
      const paper = catalog.papers.find((p) => p.year === year && p.day === day)!;
      expect(paper).toBeTruthy();
      expect(existsSync(`public${paper.cover}`)).toBe(true);
      expect(paper.variants.length).toBeGreaterThan(0);
      for (const variant of paper.variants) {
        expect(new URL(variant.url).origin).toBe("https://download.inep.gov.br");
        if (variant.answerUrl)
          expect(new URL(variant.answerUrl).origin).toBe("https://download.inep.gov.br");
      }
    }
});
it("filtra ano e dia e oferece as versões e gabaritos publicados", async () => {
  await openArchive("test");
  expect(document.querySelectorAll(".enem-paper-card")).toHaveLength(34);
  fireEvent.click(screen.getByLabelText("Ano", { selector: "summary" }));
  fireEvent.click(screen.getByRole("radio", { name: "2010" }));
  fireEvent.click(screen.getByLabelText("Dia", { selector: "summary" }));
  fireEvent.click(screen.getByRole("radio", { name: /2.*dia/ }));
  expect(document.querySelectorAll(".enem-paper-card")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Enem 2010, 2º dia" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(
    screen.getByLabelText("Versão do caderno").querySelectorAll("option").length,
  ).toBeGreaterThan(1);
  expect(screen.getByRole("tab", { name: "Gabarito" })).toHaveProperty("disabled", false);
  fireEvent.click(screen.getByRole("tab", { name: "Gabarito" }));
  expect(screen.getByRole("tab", { name: "Gabarito" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Começar prova" }));
  const chooser = screen.getByRole("dialog", { name: "Por qual área você quer começar?" });
  expect(within(chooser).getByRole("button", { name: "Iniciar prova" })).toHaveProperty(
    "disabled",
    true,
  );
  expect(within(chooser).getByRole("radio", { name: /^Redação/ })).toBeTruthy();
  fireEvent.click(within(chooser).getByRole("radio", { name: /^Matemática e suas Tecnologias/ }));
  fireEvent.click(within(chooser).getByRole("button", { name: "Iniciar prova" }));
  expect(screen.queryByRole("button", { name: "Começar prova" })).toBeNull();
  expect(screen.getByRole("tab", { name: "Prova" }).getAttribute("aria-selected")).toBe("true");
});
it("preserva salvos e conclusão e permite removê-los", async () => {
  const { unmount } = await openArchive("test");
  fireEvent.click(screen.getAllByRole("button", { name: "Salvar prova" })[0]!);
  expect(audio.unlock).toHaveBeenCalled();
  expect(audio.play).toHaveBeenCalledWith("cardReveal");
  const favorites = screen.getByRole("button", { name: "Filtrar provas favoritas" });
  expect(favorites.textContent).toContain("1");
  fireEvent.click(favorites);
  expect(document.querySelectorAll(".enem-paper-card")).toHaveLength(1);
  fireEvent.click(favorites);
  expect(document.querySelectorAll(".enem-paper-card")).toHaveLength(34);
  fireEvent.click(screen.getAllByRole("button", { name: "Marcar prova concluída" })[0]!);
  expect(audio.play).toHaveBeenCalledWith("correct");
  expect(document.querySelectorAll(".enem-paper-card.is-completed")).toHaveLength(1);
  unmount();
  await openArchive("test");
  fireEvent.click(screen.getByRole("tab", { name: "Minhas provas" }));
  expect(document.querySelectorAll(".enem-paper-card")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Remover prova dos salvos" }));
  expect(audio.play).toHaveBeenCalledWith("cosmicTap");
  fireEvent.click(screen.getByRole("button", { name: "Desmarcar prova concluída" }));
  expect(audio.play).toHaveBeenCalledWith("cosmicTap");
  expect(document.querySelectorAll(".enem-paper-card.is-completed")).toHaveLength(0);
  expect(document.querySelectorAll(".enem-paper-card")).toHaveLength(0);
});

it("oferece filtros flutuantes sem edicoes antigas", async () => {
  await openArchive("years");
  expect(catalog.papers.every((paper) => paper.year >= 2010)).toBe(true);
  fireEvent.click(screen.getByLabelText("Ano", { selector: "summary" }));
  expect(screen.queryByRole("radio", { name: "2009" })).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: "2010" }));
  expect(screen.getByLabelText("Ano", { selector: "summary" }).closest("details")?.open).toBe(
    false,
  );
  expect(document.querySelectorAll(".enem-paper-card")).toHaveLength(2);
});

it("retoma uma prova iniciada com a área e as respostas preservadas", async () => {
  await openArchive("resume");
  fireEvent.click(screen.getByRole("button", { name: "Enem 2026, 1º dia" }));
  fireEvent.click(screen.getByRole("button", { name: "Começar prova" }));
  fireEvent.click(screen.getByRole("radio", { name: /^Ciências Humanas e suas Tecnologias/ }));
  fireEvent.click(screen.getByRole("button", { name: "Iniciar prova" }));
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  fireEvent.click(
    screen.getByRole("button", { name: "Ciências Humanas e suas Tecnologias, Questão 46, A" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Voltar às provas do Enem" }));
  fireEvent.click(screen.getByRole("button", { name: "Enem 2026, 1º dia" }));
  const modal = screen.getByRole("dialog", { name: "Você tem uma prova em andamento" });
  expect(within(modal).getByText("2%")).toBeTruthy();
  fireEvent.click(within(modal).getByRole("button", { name: "Continuar" }));
  expect(
    screen
      .getByRole("button", { name: "Ciências Humanas e suas Tecnologias, Questão 46, A" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Entregar prova" }));
  const confirmation = screen.getByRole("dialog", { name: "Entregar com questões em branco?" });
  expect(within(confirmation).getByText("44")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Prova entregue!" })).toBeNull();
  fireEvent.click(within(confirmation).getByRole("button", { name: "Sim, entregar" }));
  expect(screen.getByRole("heading", { name: "Prova entregue!" })).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Ciências Humanas e suas Tecnologias, Questão 46, A" }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  fireEvent.click(screen.getByRole("button", { name: "Enem 2026, 1º dia" }));
  const chooser = screen.getByRole("dialog", { name: "Por qual área você quer começar?" });
  const submitted = within(chooser).getByRole("radio", { name: /^Ciências Humanas/ });
  expect(submitted.textContent).toContain("Entregue");
  expect(submitted.textContent).toContain("2%");
  expect(submitted.textContent).toContain("1/45");
  fireEvent.click(within(chooser).getByRole("radio", { name: /^Linguagens/ }));
  fireEvent.click(within(chooser).getByRole("button", { name: "Iniciar prova" }));
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  const paper = catalog.papers.find((item) => item.year === 2026 && item.day === 1)!;
  const history = JSON.parse(localStorage.getItem("olena.enem.history.v1:resume")!);
  expect(history[paper.id].attempts.humanities.answers["humanities:q:46"]).toBe("A");
  expect(history[paper.id].attempts.humanities.submittedAt).toEqual(expect.any(String));
  expect(history[paper.id].attempt.section).toBe("languages");
});

it("cancela a entrega sem respostas e mantém a área em andamento", async () => {
  await openArchive("empty-submit");
  fireEvent.click(screen.getByRole("button", { name: "Enem 2026, 1º dia" }));
  fireEvent.click(screen.getByRole("button", { name: "Começar prova" }));
  fireEvent.click(screen.getByRole("radio", { name: /^Ciências Humanas/ }));
  fireEvent.click(screen.getByRole("button", { name: "Iniciar prova" }));
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  expect(screen.getByText(/0\/45/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Entregar prova" }));
  const confirmation = screen.getByRole("dialog", { name: "Entregar com questões em branco?" });
  expect(within(confirmation).getByText("45")).toBeTruthy();
  fireEvent.click(within(confirmation).getByRole("button", { name: "Voltar à prova" }));
  expect(screen.queryByRole("dialog", { name: "Entregar com questões em branco?" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Prova entregue!" })).toBeNull();
  const paper = catalog.papers.find((item) => item.year === 2026 && item.day === 1)!;
  const history = JSON.parse(localStorage.getItem("olena.enem.history.v1:empty-submit")!);
  expect(history[paper.id].attempt.submittedAt).toBeUndefined();
  expect(history[paper.id].attempt.answers).toEqual({});
  expect(screen.getByRole("button", { name: "Entregar prova" })).toBeTruthy();
});

it("mostra no cartão a média das áreas e os percentuais no dropdown", async () => {
  const paper = catalog.papers.find((item) => item.year === 2026 && item.day === 1)!;
  const record = {
    section: "humanities",
    seconds: 120,
    instructions: false,
    answers: { "humanities:q:46": "A" },
    submittedAt: "2026-11-23T12:00:00Z",
  };
  localStorage.setItem(
    "olena.enem.history.v1:card-progress",
    JSON.stringify({
      [paper.id]: { completed: true, attempt: record, attempts: { humanities: record } },
    }),
  );
  await openArchive("card-progress");
  const card = screen.getByRole("button", { name: "Enem 2026, 1º dia" }).closest("article")!;
  const summary = within(card).getByLabelText("Progresso da prova: 1%");
  fireEvent.click(summary);
  expect(summary.closest("details")?.open).toBe(true);
  const humanities = within(card).getByText("Ciências Humanas e suas Tecnologias").parentElement!;
  expect(humanities.textContent).toContain("Entregue");
  expect(humanities.textContent).toContain("2%");
  const languages = within(card).getByText("Linguagens, Códigos e suas Tecnologias").parentElement!;
  expect(languages.textContent).toContain("0%");
  expect(within(card).getByText("Redação").parentElement!.textContent).toContain("0%");
});

it("mostra o carregamento e permite tentar de novo quando o catálogo falha", async () => {
  vi.resetModules();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response("erro", { status: 500 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(catalog), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const { default: Archive } = await import("./enem-archive");
  render(<Archive scope="retry" onBack={vi.fn()} />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await screen.findByLabelText("Ano", { selector: "summary" });
  expect(document.querySelectorAll(".enem-paper-card")).toHaveLength(34);
});

it("fecha o balão anterior ao abrir o progresso de outra prova", async () => {
  await openArchive("one-progress");
  const panels = document.querySelectorAll<HTMLDetailsElement>(".enem-card-progress");
  const first = panels[0]!;
  const second = panels[1]!;
  first.open = true;
  fireEvent(first, new Event("toggle"));
  expect(first.open).toBe(true);
  second.open = true;
  fireEvent(second, new Event("toggle"));
  expect(second.open).toBe(true);
  expect(first.open).toBe(false);
  expect(second.getAttribute("name")).toBe(first.getAttribute("name"));
});
