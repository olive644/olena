import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
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
  expect(footer?.querySelector("img")?.getAttribute("src")).toBe("/galeria-oli-icon.png");
});
