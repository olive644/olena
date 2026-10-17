import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PageHeader } from "./app-navigation";

afterEach(cleanup);
it("mostra notificações por padrão, com exclusão explícita no Perfil", async () => {
  const view = render(<PageHeader showUpdates={false} />);
  expect(view.container.querySelector(".profile-menu")).toBeNull();
  expect(view.container.querySelector(".system-updates")).toBeNull();
  view.rerender(<PageHeader showUpdates />);
  expect(await screen.findByLabelText(/Atualizações/)).toBeTruthy();
  view.rerender(<PageHeader showUpdates={false} />);
  expect(view.container.querySelector(".system-updates")).toBeNull();
});
