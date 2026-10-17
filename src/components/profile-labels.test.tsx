import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ProfileLabels } from "./profile-labels";
afterEach(cleanup);
it("exibe somente CREKS para o @miauyw confirmado", () => {
  render(<ProfileLabels username="miauyw" creks={false} />);
  expect(screen.getByLabelText("Selo CREKS")).toBeTruthy();
  expect(screen.queryByLabelText("Selo BETA TESTER")).toBeNull();
});
it("não concede o rótulo para um @ parecido", () => {
  const { container } = render(<ProfileLabels username="miauyw.fake" creks={false} />);
  expect(container.textContent).toBe("");
});
