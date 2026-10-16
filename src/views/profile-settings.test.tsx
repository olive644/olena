import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { ProfileView } from "./profile-view";
import { createInitialWorkspace } from "../domain/workspace";
import { initializeAccessibility } from "../data/accessibility-preferences";
import { NOTEBOOK_PREFERENCES_KEY } from "../data/notebook-preferences";
vi.mock("../data/profile-handle", () => ({
  PROFILE_HANDLE_CHANGED: "olena:profile-handle-changed",
  requestProfileHandle: async (_method: string, username: string) => ({ username, creks: false }),
}));

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
  expect(screen.queryByRole("navigation", { name: "Seções do Perfil" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Configurações" }));
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
it("edita a identidade sem trocar a conta Google nem recriar a foto no cabeçalho", async () => {
  openProfile();
  fireEvent.click(screen.getByRole("button", { name: "Editar perfil" }));
  fireEvent.change(screen.getByLabelText("Apelido"), { target: { value: "Estudante" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem("helena.profile.v1")!)).toMatchObject({
      name: "Estudante",
    }),
  );
  expect(screen.getByText("Estudante", { selector: "strong" })).toBeTruthy();
  expect(document.querySelector(".page-header .user-profile")).toBeNull();
});
it("mantém tema somente nas configurações e preserva as preferências do editor", () => {
  openProfile();
  section("Aparência e acessibilidade");
  fireEvent.click(
    within(screen.getByRole("region", { name: "Seu papel, sua luz" })).getByRole("button", {
      name: "Escuro",
    }),
  );
  expect(document.documentElement.dataset["theme"]).toBe("dark");
  expect(document.querySelector(".page-header__theme")).toBeNull();
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
