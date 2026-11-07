import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ProfileLabels } from "./profile-labels";
afterEach(cleanup);
it("mantém BETA TESTER e remove DEV e GALAXIA do @bizzok exato", () => {
  const view = render(<ProfileLabels username="bizzok" creks={false} />);
  expect(screen.getByLabelText("Selo BETA TESTER")).toBeTruthy();
  expect(screen.queryByLabelText("Selo DEV")).toBeNull();
  expect(screen.queryByLabelText("Selo GALAXIA")).toBeNull();
  expect(screen.queryByLabelText("Selo CREKS")).toBeNull();
  view.rerender(<ProfileLabels username="bizzok.fake" creks={false} />);
  expect(view.container.textContent).toBe("");
});
it("exibe somente CREKS para o @miauyw confirmado", () => {
  render(<ProfileLabels username="miauyw" creks={false} />);
  expect(screen.getByLabelText("Selo CREKS")).toBeTruthy();
  expect(screen.queryByLabelText("Selo BETA TESTER")).toBeNull();
});
it("não concede o rótulo para um @ parecido", () => {
  const { container } = render(<ProfileLabels username="miauyw.fake" creks={false} />);
  expect(container.textContent).toBe("");
});
