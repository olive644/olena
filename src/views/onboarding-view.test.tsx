import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OnboardingView from "./onboarding-view";
import { PRACTICE_ISLANDS } from "../data/practice-islands";

it("mostra o nome OlenaStudy na marca do onboarding", () => {
  const { container } = render(<OnboardingView onFinish={vi.fn()} />);
  const brand = container.querySelector(".onboarding__brand");
  expect(brand?.textContent).toBe("OlenaStudy");
});

it("mostra o rodapé da Galeria.Oli com o ícone em todos os passos", () => {
  const { container } = render(<OnboardingView onFinish={vi.fn()} />);
  const footer = container.querySelector("footer.brand-footer");
  expect(footer?.textContent).toBe("Todos os direitos Galeria.Oli - OlenaStudy");
  expect([...footer!.querySelectorAll("img")].map((image) => image.getAttribute("src"))).toEqual([
    "/olena-favicon-180.png",
    "/galeria-oli-icon.svg",
  ]);
});

describe("conversa da Olena", () => {
  it("oferece todas as matérias das ilhas e idiomas asiáticos com ícones próprios", () => {
    const { container } = render(<OnboardingView onFinish={vi.fn()} />);
    expect(container.querySelector(".onboarding__eyebrow")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ensino médio" }));
    for (const island of PRACTICE_ISLANDS)
      expect(screen.getByRole("button", { name: island.subject })).toBeTruthy();
    for (const icon of container.querySelectorAll(".onboarding__choices use"))
      expect(icon.getAttribute("href")).toContain("/onboarding-journey.svg#");
    fireEvent.click(screen.getByRole("button", { name: "Matemática" }));
    expect(screen.getByRole("button", { name: "Japonês" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Chinês" })).toBeTruthy();
  });
  it("abre com a Olena se apresentando e a primeira pergunta como resposta rápida", () => {
    render(<OnboardingView onFinish={vi.fn()} />);
    expect(screen.getByText("Oi! Eu sou a Olena, sua assistente de estudos.")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Em que fase dos estudos você está?" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ensino médio" })).toBeTruthy();
  });

  it("responde em balão, a Olena reage e a próxima pergunta entra", () => {
    render(<OnboardingView onFinish={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Ensino médio" }));
    expect(screen.getByText("Boa! Já dá para montar um começo sob medida.")).toBeTruthy();
    expect(screen.getByText(/Sua resposta:/).parentElement?.textContent).toContain("Ensino médio");
    expect(
      screen.getByRole("heading", { name: "Qual matéria desperta sua curiosidade?" }),
    ).toBeTruthy();
  });

  it("pergunta de várias respostas só avança com Continuar e ao menos uma escolha", () => {
    render(<OnboardingView onFinish={vi.fn()} />);
    for (const choice of ["Ensino médio", "Matemática", "Inglês", "Criar uma rotina"])
      fireEvent.click(screen.getByRole("button", { name: choice }));
    const next = screen.getByRole("button", { name: "Continuar" });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    const visual = screen.getByRole("button", { name: "Visual" });
    fireEvent.click(visual);
    expect(visual.getAttribute("aria-pressed")).toBe("true");
    expect((next as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(next);
    expect(
      screen.getByRole("heading", { name: "Como você gosta de organizar o estudo?" }),
    ).toBeTruthy();
  });

  it("Voltar reabre a pergunta anterior com a resposta marcada", () => {
    render(<OnboardingView onFinish={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Ensino médio" }));
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(
      screen.getByRole("heading", { name: "Em que fase dos estudos você está?" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ensino médio" }).className).toContain("is-selected");
    expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
  });

  it("depois da última pergunta mostra Registre-se sem antecipar o acesso", () => {
    render(<OnboardingView onFinish={vi.fn()} />);
    for (const choice of ["Ensino médio", "Matemática", "Inglês", "Criar uma rotina", "Visual"]) {
      fireEvent.click(screen.getByRole("button", { name: choice }));
      if (choice === "Visual") fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    }
    for (const choice of ["Passo a passo", "Foco contínuo", "Agora não", "15 minutos"])
      fireEvent.click(screen.getByRole("button", { name: choice }));
    expect(
      screen.getByText("Prontinho! Seu começo está preparado. Vamos criar seu espaço?"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Registre-se" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Entrar com Google" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Entrar como convidado" })).toBeNull();
  });

  it("oferece convidado somente na tela final e preserva as respostas", async () => {
    const finish = vi.fn();
    render(<OnboardingView onFinish={finish} />);
    for (const choice of ["Ensino médio", "Matemática", "Inglês", "Criar uma rotina", "Visual"]) {
      fireEvent.click(screen.getByRole("button", { name: choice }));
      if (choice === "Visual") fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    }
    for (const choice of ["Passo a passo", "Foco contínuo", "Agora não", "15 minutos"])
      fireEvent.click(screen.getByRole("button", { name: choice }));
    expect(screen.queryByRole("button", { name: "Entrar como convidado" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Registre-se" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Entrar como convidado" })).toBeTruthy(),
    );
    expect(finish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Entrar como convidado" }));
    expect(finish).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("helena.guest.v1")).toBe("1");
    expect(JSON.parse(localStorage.getItem("helena.onboarding.v1") ?? "{}").completed).toBe(true);
    localStorage.removeItem("helena.guest.v1");
  });

  it("a Olena usa arte recortada, sem fundo marfim nem mistura de cor", () => {
    const { container } = render(<OnboardingView onFinish={vi.fn()} />);
    expect(container.querySelector(".onboarding__helena")?.getAttribute("src")).toMatch(
      /-cutout\.webp$/,
    );
  });
});
