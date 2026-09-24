import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import OnboardingView from "./onboarding-view";

it("mostra o nome OlenaStudy na marca do onboarding", () => {
  const { container } = render(<OnboardingView onFinish={vi.fn()} />);
  const brand = container.querySelector(".onboarding__brand");
  expect(brand?.textContent).toBe("OlenaStudy");
});
