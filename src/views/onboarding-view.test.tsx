import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OnboardingView from "./onboarding-view";

it("mostra o nome OlenaStudy na marca do onboarding", () => {
  const { container } = render(<OnboardingView onFinish={vi.fn()} />);
  const brand = container.querySelector(".onboarding__brand");
  expect(brand?.textContent).toBe("OlenaStudy");
});

it("mostra o rodapé da Galeria.Oli com o ícone em todos os passos", () => {
  const { container } = render(<OnboardingView onFinish={vi.fn()} />);
  const footer = container.querySelector("footer.brand-footer");
  expect(footer?.textContent).toBe("Todos os direitos Galeria.Oli - OlenaStudy");
  expect(footer?.querySelector("img")?.getAttribute("src")).toBe("/galeria-oli-icon.svg");
});

describe("conversa da Olena", () => {
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

  it("depois da última pergunta a Olena chama para entrar com Google", () => {
    render(<OnboardingView onFinish={vi.fn()} />);
    for (const choice of ["Ensino médio", "Matemática", "Inglês", "Criar uma rotina", "Visual"]) {
      fireEvent.click(screen.getByRole("button", { name: choice }));
      if (choice === "Visual") fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    }
    for (const choice of ["Passo a passo", "Foco contínuo", "Agora não", "15 minutos"])
      fireEvent.click(screen.getByRole("button", { name: choice }));
    expect(screen.getByText("Prontinho! Falta só entrar com o Google para começar.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar com Google" })).toBeTruthy();
  });

  it("mantém Entrar como convidado já na despedida da Olena, sem passar pelo Google", () => {
    const finish = vi.fn();
    render(<OnboardingView onFinish={finish} />);
    for (const choice of ["Ensino médio", "Matemática", "Inglês", "Criar uma rotina", "Visual"]) {
      fireEvent.click(screen.getByRole("button", { name: choice }));
      if (choice === "Visual") fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    }
    for (const choice of ["Passo a passo", "Foco contínuo", "Agora não", "15 minutos"])
      fireEvent.click(screen.getByRole("button", { name: choice }));
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
