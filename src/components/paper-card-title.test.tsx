import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PaperCardTitle } from "./paper-card-title";

afterEach(cleanup);
it("keeps accented titles accessible and reuses the app alphabet", () => {
  const { container } = render(
    <h2>
      <PaperCardTitle value="Vigília azul" />
    </h2>,
  );
  expect(screen.getByRole("heading", { name: "Vigília azul" })).toBeTruthy();
  expect(container.querySelectorAll(".paper-card-word")).toHaveLength(2);
  expect(container.querySelectorAll("use")).toHaveLength(11);
  expect(container.querySelector("path")?.getAttribute("d")).toContain("-17");
});
