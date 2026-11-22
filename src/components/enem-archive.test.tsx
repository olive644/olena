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
  expect(within(chooser).getByRole("radio", { name: "Redação" })).toBeTruthy();
  fireEvent.click(within(chooser).getByRole("radio", { name: "Matemática e suas Tecnologias" }));
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
  fireEvent.click(screen.getByRole("radio", { name: "Ciências Humanas e suas Tecnologias" }));
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
  expect(screen.getByRole("heading", { name: "Prova entregue!" })).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Ciências Humanas e suas Tecnologias, Questão 46, A" }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  fireEvent.click(screen.getByRole("button", { name: "Enem 2026, 1º dia" }));
  expect(screen.getByRole("heading", { name: "Prova entregue!" })).toBeTruthy();
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
