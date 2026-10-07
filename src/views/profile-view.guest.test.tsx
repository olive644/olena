import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { createInitialWorkspace } from "../domain/workspace";
import type { CloudSyncState } from "../hooks/use-cloud-sync";
import { ProfileView } from "./profile-view";
import { initializeAccessibility, ACCESSIBILITY_KEY } from "../data/accessibility-preferences";

const cloud: CloudSyncState = { ready: true, revision: 0, enabled: true, status: "signed-out" };

function renderProfile(guest: boolean, onSignIn = vi.fn()) {
  render(
    <ProfileView
      workspace={createInitialWorkspace()}
      dispatch={vi.fn()}
      cloud={cloud}
      guest={guest}
      onSignIn={onSignIn}
      history={[]}
      onRestoreSnapshot={vi.fn()}
    />,
  );
  return onSignIn;
}

it("mostra Guest, avisa que os estudos ficam no aparelho e oferece entrar com Google", () => {
  const signIn = renderProfile(true);
  expect(screen.getByText("Guest (convidado)")).toBeTruthy();
  expect(screen.getByText("Somente neste aparelho")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Sincronizar agora" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Sair desta conta" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Entrar com Google" }));
  expect(signIn).toHaveBeenCalledOnce();
});

it("mantém sincronizar e sair para quem tem conta", () => {
  renderProfile(false);
  expect(screen.getByRole("button", { name: "Sincronizar agora" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Sair desta conta" })).toBeTruthy();
  expect(screen.queryByText("Guest (convidado)")).toBeNull();
});

it("oferece acessibilidade geral no Perfil e salva a escolha", () => {
  localStorage.removeItem(ACCESSIBILITY_KEY);
  const dispose = initializeAccessibility();
  renderProfile(true);
  fireEvent.click(screen.getByRole("checkbox", { name: /Reduzir movimento/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Realçar seleções/ }));
  expect(JSON.parse(localStorage.getItem(ACCESSIBILITY_KEY)!)).toEqual({
    reduceMotion: true,
    highlightSelections: true,
  });
  expect(document.documentElement.dataset["reduceMotion"]).toBe("true");
  dispose();
  localStorage.removeItem(ACCESSIBILITY_KEY);
  initializeAccessibility()();
});
