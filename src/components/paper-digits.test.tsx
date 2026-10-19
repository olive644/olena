import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PaperDigits, PaperDigitsSource } from "./paper-digits";
afterEach(cleanup);
it("troca só o SVG do dígito alterado, sem reutilizar a imagem anterior", () => {
  const view = render(<PaperDigits value="00:10" />);
  const before = [...view.container.querySelectorAll("svg")];
  view.rerender(<PaperDigits value="00:09" />);
  const after = [...view.container.querySelectorAll("svg")];
  expect(after[0]).toBe(before[0]);
  expect(after[1]).toBe(before[1]);
  expect(after[2]).not.toBe(before[2]);
  expect(after[3]).not.toBe(before[3]);
  expect(after[3]?.querySelector("use")?.getAttribute("href")).toContain("digit-9");
});
it("preserves the original external source outside the offline game scope", () => {
  const view = render(<PaperDigits value="12:30" />);
  expect(
    [...view.container.querySelectorAll("use")].map((element) => element.getAttribute("href")),
  ).toEqual([
    "/paper-digits.svg#digit-1",
    "/paper-digits.svg#digit-2",
    "/paper-digits.svg#digit-3",
    "/paper-digits.svg#digit-0",
  ]);
});
it("uses local symbols inside the game without affecting neighboring digits", () => {
  const view = render(
    <>
      <PaperDigitsSource source="#math-">
        <PaperDigits value="100" />
      </PaperDigitsSource>
      <PaperDigits value="5" />
    </>,
  );
  expect(
    [...view.container.querySelectorAll("use")].map((element) => element.getAttribute("href")),
  ).toEqual(["#math-digit-1", "#math-digit-0", "#math-digit-0", "/paper-digits.svg#digit-5"]);
});
