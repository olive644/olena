import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { PaperObjectIcon } from "./paper-object-icon";
import { PaperActionIcon } from "./paper-action-icon";
it("sprites de papel preservam símbolos locais, sem scripts ou recursos remotos", () => {
  for (const file of [
    "paper-editor-icon",
    "paper-object-icon",
    "onboarding-paper-icon",
    "paper-action-icon",
    "math-achievements",
  ]) {
    const raw = readFileSync(`public/navigation-icons/paper/${file}.svg`, "utf8");
    const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.querySelectorAll("symbol").length).toBeGreaterThan(5);
    expect(doc.querySelector("script,foreignObject")).toBeNull();
    expect(raw).not.toMatch(/https?:\/\/(?!www\.w3\.org\/)/);
  }
});
it("objetos e ações continuam SVGs decorativos com os mesmos identificadores", () => {
  const { container } = render(
    <>
      <PaperObjectIcon name="ruler" />
      <PaperActionIcon name="handwriting" />
    </>,
  );
  expect(container.querySelector('[data-paper-object="ruler"] use')?.getAttribute("href")).toBe(
    "/navigation-icons/paper/paper-object-icon.svg#ruler",
  );
  expect(container.querySelector('[data-paper-icon="handwriting"] use')?.getAttribute("href")).toBe(
    "/navigation-icons/paper/paper-action-icon.svg#handwriting",
  );
  cleanup();
});
