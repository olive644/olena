import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PageHeader } from "./app-navigation";

afterEach(cleanup);
it("mantém aparência sem foto e mostra atualizações somente quando solicitado pelo Espaço", async () => {
  const view = render(<PageHeader />);
  expect(view.container.querySelector(".profile-menu")).toBeNull();
  expect(view.container.querySelector(".system-updates")).toBeNull();
  view.rerender(<PageHeader showUpdates />);
  expect(await screen.findByLabelText(/Atualizações/)).toBeTruthy();
  view.rerender(<PageHeader />);
  expect(view.container.querySelector(".system-updates")).toBeNull();
});
