import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { OnboardingPaperIcon } from "./onboarding-paper-icon";
import { PaperArrow } from "./paper-arrow";

afterEach(cleanup);
it("keeps paper fills isolated from navigation line-icon styles", () => {
  const { container } = render(<OnboardingPaperIcon name="science" />);
  expect(container.querySelector(".navigation-icon")).toBeNull();
  expect(container.querySelector('path[fill="#FACC15"]')).not.toBeNull();
  expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
});
it.each(["flag-us", "flag-br", "flag-es"])("renders a separate country design for %s", (name) => {
  const { container } = render(<OnboardingPaperIcon name={name} />);
  expect(container.querySelector("svg")?.getAttribute("data-paper-icon")).toBe(name);
  if (name === "flag-us")
    expect(container.querySelector("image")?.getAttribute("href")).toBe("/room-icons/english.svg");
  else expect(container.querySelectorAll("path").length).toBeGreaterThan(3);
});
it("uses the same folded arrow reversed for back", () => {
  const { container } = render(<PaperArrow back />);
  const arrow = container.querySelector("img");
  expect(arrow?.getAttribute("src")).toBe("/paper-arrow.svg");
  expect(arrow?.classList.contains("is-back")).toBe(true);
});
