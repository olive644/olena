import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PaperDigits, PaperDigitsSource } from "./paper-digits";
afterEach(cleanup);
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
