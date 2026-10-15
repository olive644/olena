import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ProfileView } from "./profile-view";
import { createInitialWorkspace } from "../domain/workspace";
import { initializeAccessibility } from "../data/accessibility-preferences";
import { NOTEBOOK_PREFERENCES_KEY } from "../data/notebook-preferences";

beforeEach(() => {
  localStorage.clear();
  initializeAccessibility()();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  initializeAccessibility()();
});
function openProfile() {
  const dispatch = vi.fn();
  render(
    <ProfileView
      workspace={createInitialWorkspace()}
      dispatch={dispatch}
      cloud={{ enabled: false, ready: true, revision: 0, status: "disabled" }}
      history={[]}
      onRestoreSnapshot={vi.fn()}
    />,
  );
  return dispatch;
}
function section(name: string) {
  fireEvent.click(
    within(screen.getByRole("navigation", { name: "Seções do Perfil" })).getByRole("button", {
      name,
    }),
  );
}
it("organiza as opções reais sem placeholders e muda o Pomodoro pelo painel de estudo", () => {
  const dispatch = openProfile();
  expect(screen.queryByText("Em produção")).toBeNull();
  expect(screen.queryByText("Mais informações em breve.")).toBeNull();
  expect(screen.queryByRole("heading", { name: "Preferências de estudo" })).toBeNull();
  section("Estudo e foco");
  fireEvent.click(screen.getByRole("button", { name: "50 minutos" }));
  expect(dispatch).toHaveBeenCalledWith({
    type: "focus/preferences-updated",
    preferences: { pomodoroMinutes: 50, longBreaks: true },
  });
});
it("edita a identidade sem trocar a conta Google e atualiza o cabeçalho", () => {
  openProfile();
  fireEvent.change(screen.getByLabelText("Nome no aplicativo"), { target: { value: "Estudante" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar nome" }));
  expect(JSON.parse(localStorage.getItem("helena.profile.v1")!)).toEqual({ name: "Estudante" });
  expect(screen.getByLabelText("Perfil de Estudante")).toBeTruthy();
});
it("compartilha tema com o cabeçalho e preserva as preferências do editor", () => {
  openProfile();
  section("Aparência e acessibilidade");
  fireEvent.click(
    within(screen.getByRole("region", { name: "Seu papel, sua luz" })).getByRole("button", {
      name: "Escuro",
    }),
  );
  expect(document.documentElement.dataset["theme"]).toBe("dark");
  expect(screen.getByLabelText(/Aparência: tema escuro/)).toBeTruthy();
  section("Cadernos");
  fireEvent.click(screen.getByRole("checkbox", { name: /Só caneta, dedo move/ }));
  expect(JSON.parse(localStorage.getItem(NOTEBOOK_PREFERENCES_KEY)!)).toMatchObject({
    penOnly: true,
  });
});
it("solicita a permissão real e explica quando ela foi bloqueada pelo navegador", async () => {
  const requestPermission = vi.fn().mockResolvedValue("denied");
  vi.stubGlobal("Notification", { permission: "default", requestPermission });
  openProfile();
  section("Agenda e notificações");
  fireEvent.click(screen.getByRole("button", { name: "Permitir notificações" }));
  expect(await screen.findByText("Bloqueados pelo navegador")).toBeTruthy();
  expect(requestPermission).toHaveBeenCalledOnce();
  expect(
    screen.getByRole("button", { name: "Permitir notificações" }).hasAttribute("disabled"),
  ).toBe(true);
});
