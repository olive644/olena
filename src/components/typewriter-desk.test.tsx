import { useReducer } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TypewriterDesk } from "./typewriter-desk";
import { ESSAY_CATEGORIES, ESSAY_PROPOSALS } from "../data/essay-catalog";
import { ESSAY_VISUALS } from "../data/essay-visuals";
import { createInitialWorkspace, workspaceReducer } from "../domain/workspace";
afterEach(cleanup);
function Host() {
  const [workspace, dispatch] = useReducer(workspaceReducer, createInitialWorkspace());
  return (
    <TypewriterDesk
      workspace={workspace}
      collectionId="machine"
      dispatch={dispatch}
      onBack={vi.fn()}
    />
  );
}
it("mostra todas as propostas nos seis tópicos sem o editor inicial", () => {
  render(<Host />);
  expect(ESSAY_CATEGORIES).toHaveLength(6);
  expect(ESSAY_PROPOSALS).toHaveLength(60);
  expect(new Set(ESSAY_PROPOSALS.map((p) => p.id)).size).toBe(60);
  for (const category of ESSAY_CATEGORIES)
    expect(screen.getByRole("heading", { name: category.title })).toBeTruthy();
  expect(screen.getAllByRole("button", { name: /Proposta \d+/ })).toHaveLength(60);
  expect(screen.queryByRole("textbox")).toBeNull();
});
it("abre textos próprios, salva por proposta e recupera ao voltar", () => {
  render(<Host />);
  const title = ESSAY_PROPOSALS[0]!.title;
  fireEvent.click(screen.getByRole("button", { name: new RegExp("Proposta 1.*" + title) }));
  expect(screen.getByRole("heading", { name: "Proposta de redação" })).toBeTruthy();
  expect(screen.getAllByText("Texto de apoio autoral Olena")).toHaveLength(2);
  for (const text of [
    ESSAY_VISUALS["essay-01"].context,
    ESSAY_VISUALS["essay-01"].authorText,
    ESSAY_VISUALS["essay-01"].discussion,
  ]) {
    for (const paragraph of text.split("\n\n")) expect(screen.getByText(paragraph)).toBeTruthy();
  }
  expect(screen.getByRole("heading", { name: "Texto I" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Texto II" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Texto III" })).toBeTruthy();
  expect(
    screen
      .getByRole("img", { name: /A conexão também tem território/ })
      .closest(".essay-support-column")?.textContent,
  ).toContain(ESSAY_VISUALS["essay-01"].context.split("\n\n")[0]);
  expect(screen.getByRole("img", { name: /A conexão também tem território/ })).toBeTruthy();
  const input = screen.getByRole("textbox", { name: "Sua redação" });
  fireEvent.change(input, { target: { value: "Minha tese e meus argumentos." } });
  fireEvent.click(screen.getByRole("button", { name: "Voltar às propostas" }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp("Proposta 1.*" + title) }));
  expect(screen.getByRole("textbox", { name: "Sua redação" })).toHaveProperty(
    "value",
    "Minha tese e meus argumentos.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Entregar redação" }));
  expect(
    screen
      .getByText("Treino concluído. Sua redação foi salva, sem nota automática.")
      .getAttribute("role"),
  ).toBe("status");
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  expect(screen.getByRole("img", { name: "Treino concluído" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: new RegExp("Proposta 1.*" + title) }));
  expect(screen.getByRole("heading", { name: "Redação entregue!" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Sua redação" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Entregar redação" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  expect(screen.queryByRole("tab", { name: "Minhas redações" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Minhas redações" })).toBeTruthy();
  fireEvent.click(screen.getAllByRole("button", { name: new RegExp(title) })[0]!);
  expect(screen.getByRole("heading", { name: "Sua redação entregue" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Sua redação" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /^Continuar$/ }));
  fireEvent.click(screen.getByRole("tab", { name: /^Redação$/ }));
  fireEvent.click(screen.getByRole("button", { name: /Proposta 2[^0-9]/ }));
  expect(screen.getByRole("textbox", { name: "Sua redação" })).toHaveProperty("value", "");
});

it("alterna abas acessíveis, com navegação por teclado e acervos oficiais", () => {
  render(<Host />);
  const essay = screen.getByRole("tab", { name: "Redação" });
  const entrance = screen.getByRole("tab", { name: "Vestibular (em breve)" });
  expect(essay.getAttribute("aria-selected")).toBe("true");
  fireEvent.keyDown(essay, { key: "ArrowRight" });
  expect(entrance.getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("link", { name: /Fuvest/ }).getAttribute("href")).toBe(
    "https://www.fuvest.br/acervo-vestibular",
  );
  expect(screen.queryByRole("heading", { name: "Tecnologia e Sociedade" })).toBeNull();
  fireEvent.keyDown(entrance, { key: "Home" });
  expect(screen.getByRole("heading", { name: "Tecnologia e Sociedade" })).toBeTruthy();
});
it("desfaz digitação em blocos, refaz e descarta o futuro após nova edição", () => {
  render(<Host />);
  fireEvent.click(screen.getByRole("button", { name: /Proposta 1[^0-9]/ }));
  const input = screen.getByRole("textbox", { name: "Sua redação" });
  for (const value of ["T", "Te", "Tes", "Tese"]) fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
  expect(input).toHaveProperty("value", "");
  fireEvent.click(screen.getByRole("button", { name: "Refazer" }));
  expect(input).toHaveProperty("value", "Tese");
  fireEvent.change(input, { target: { value: "Tese e argumento colado" } });
  fireEvent.keyDown(input, { key: "z", ctrlKey: true });
  expect(input).toHaveProperty("value", "Tese");
  fireEvent.keyDown(input, { key: "z", ctrlKey: true, shiftKey: true });
  expect(input).toHaveProperty("value", "Tese e argumento colado");
  fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
  fireEvent.change(input, { target: { value: "Outra tese" } });
  expect(screen.getByRole("button", { name: "Refazer" })).toHaveProperty("disabled", true);
});
