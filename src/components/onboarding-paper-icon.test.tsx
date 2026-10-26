import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { OnboardingPaperIcon } from "./onboarding-paper-icon";
import { PaperArrow } from "./paper-arrow";
import { readFileSync } from "node:fs";

const symbols = new DOMParser().parseFromString(
  readFileSync("public/navigation-icons/paper/onboarding-paper-icon.svg", "utf8"),
  "image/svg+xml",
);

afterEach(cleanup);
it("uses original journey symbols without changing icons shared by other screens", () => {
  const journey = new DOMParser().parseFromString(
    readFileSync("public/navigation-icons/paper/onboarding-journey.svg", "utf8"),
    "image/svg+xml",
  );
  const icons = [...journey.querySelectorAll("symbol")];
  expect(icons).toHaveLength(40);
  expect(new Set(icons.map((icon) => icon.innerHTML)).size).toBe(40);
  for (const icon of icons) {
    expect(icon.querySelectorAll("path").length).toBeGreaterThanOrEqual(2);
    const view = render(<OnboardingPaperIcon name={`journey-${icon.id}`} />);
    expect(view.container.querySelector("use")?.getAttribute("href")).toBe(
      `/navigation-icons/paper/onboarding-journey.svg#${icon.id}`,
    );
    view.unmount();
  }
});
it("keeps paper fills isolated from navigation line-icon styles", () => {
  const { container } = render(<OnboardingPaperIcon name="science" />);
  expect(container.querySelector(".navigation-icon")).toBeNull();
  expect(symbols.getElementById("science")?.querySelector('path[fill="#FACC15"]')).not.toBeNull();
  expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
});
it.each(["flag-us", "flag-br", "flag-es"])("renders a separate country design for %s", (name) => {
  const { container } = render(<OnboardingPaperIcon name={name} />);
  expect(container.querySelector("svg")?.getAttribute("data-paper-icon")).toBe(name);
  if (name === "flag-us")
    expect(symbols.getElementById(name)?.querySelector("image")?.getAttribute("href")).toBe(
      "/room-icons/english.svg",
    );
  else expect(symbols.getElementById(name)?.querySelectorAll("path").length).toBeGreaterThan(3);
});
it("uses the same folded arrow reversed for back", () => {
  const { container } = render(<PaperArrow back />);
  const arrow = container.querySelector("img");
  expect(arrow?.getAttribute("src")).toBe("/paper-arrow.svg");
  expect(arrow?.classList.contains("is-back")).toBe(true);
});
it("conserva o desenho genérico de duração personalizada", () => {
  const { container } = render(<OnboardingPaperIcon name="clock-90" />);
  expect(container.querySelector("use")?.getAttribute("href")).toBe(
    "/navigation-icons/paper/onboarding-paper-icon.svg#clock-50",
  );
});
