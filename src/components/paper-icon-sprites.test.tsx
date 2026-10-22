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
    "achievement-objects",
  ]) {
    const raw = readFileSync(`public/navigation-icons/paper/${file}.svg`, "utf8");
    const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.querySelectorAll("symbol").length).toBeGreaterThan(5);
    expect(doc.querySelector("script,foreignObject")).toBeNull();
    expect(raw).not.toMatch(/https?:\/\/(?!www\.w3\.org\/)/);
  }
});
it("oferece 57 composições distintas e preserva os seis ícones de sala", () => {
  const doc = new DOMParser().parseFromString(
    readFileSync("public/navigation-icons/paper/achievement-objects.svg", "utf8"),
    "image/svg+xml",
  );
  const symbols = [...doc.querySelectorAll("symbol")];
  expect(symbols).toHaveLength(57);
  expect(new Set(symbols.map((item) => item.innerHTML)).size).toBe(57);
  const social = new DOMParser().parseFromString(
    readFileSync("public/room-icons/social-actions.svg", "utf8"),
    "image/svg+xml",
  );
  expect([...social.querySelectorAll("symbol")].map((item) => item.id)).toEqual([
    "copy",
    "lock",
    "open",
    "ready",
    "away",
    "remove",
  ]);
  for (const file of ["points", "solar-frames"]) {
    const raw = readFileSync(`public/room-icons/${file}.svg`, "utf8");
    const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
    expect(doc.querySelector("parsererror,script,foreignObject")).toBeNull();
    expect(doc.querySelectorAll("symbol").length).toBe(file === "points" ? 1 : 3);
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
