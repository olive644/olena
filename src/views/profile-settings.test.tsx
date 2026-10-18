import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { CloudSyncState } from "../hooks/use-cloud-sync";
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
function openProfile(
  cloud: CloudSyncState = { enabled: false, ready: true, revision: 0, status: "disabled" },
) {
  const dispatch = vi.fn();
  render(
    <ProfileView
      workspace={createInitialWorkspace()}
      dispatch={dispatch}
      cloud={cloud}
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
it("mostra informações da conta sem duplicar os editores do perfil", () => {
  openProfile({
    enabled: true,
    ready: true,
    revision: 0,
    status: "synced",
    authenticated: true,
    email: "aluno@example.test",
    deleteAccount: vi.fn(),
    displayName: "Estudante",
  });
  expect(screen.getByText("aluno@example.test")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Informações" })).toBeTruthy();
  expect(screen.queryByText("Como você aparece")).toBeNull();
  expect(screen.queryByRole("button", { name: "Editar perfil" })).toBeNull();
  expect(screen.queryByText("Escolher avatar")).toBeNull();
  expect(screen.queryByText("Conta e sincronização")).toBeNull();
  expect(
    within(screen.getByRole("navigation", { name: "Seções do Perfil" })).queryByRole("button", {
      name: "Meu progresso",
    }),
  ).toBeNull();
  expect(screen.getByRole("heading", { name: "Excluir conta" })).toBeTruthy();
  section("Privacidade e dados");
  expect(screen.getByRole("link", { name: "Termos de uso" }).getAttribute("href")).toBe(
    "/termos-de-uso.html",
  );
  expect(screen.getByRole("link", { name: "Termos de uso" }).getAttribute("rel")).toBe(
    "noopener noreferrer",
  );
  expect(screen.queryByText(/O rascunho está em revisão/)).toBeNull();
  expect(screen.queryByRole("heading", { name: "Excluir conta" })).toBeNull();
  expect(screen.queryByText("Recuperação local")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Voltar ao perfil" }));
  expect(screen.getByRole("region", { name: "Seu perfil" })).toBeTruthy();
});
it("não apresenta e-mail antigo enquanto a identidade não foi confirmada", () => {
  openProfile({
    enabled: true,
    ready: false,
    revision: 0,
    status: "loading",
    email: "anterior@example.test",
  });
  expect(screen.queryByText("anterior@example.test")).toBeNull();
  section("Privacidade e dados");
  expect(screen.getByRole("button", { name: "Exportar meus dados" }).hasAttribute("disabled")).toBe(
    true,
  );
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
