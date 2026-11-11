import { render, screen } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { App } from "./app";
import { useCloudSync } from "./hooks/use-cloud-sync";

vi.mock("./hooks/use-cloud-sync", () => ({ useCloudSync: vi.fn() }));

it("does not flash onboarding while restoring an existing account after provider login", async () => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.mocked(useCloudSync).mockReturnValue({
    enabled: true,
    ready: false,
    authenticated: true,
    status: "loading",
    revision: 1,
  });
  const view = render(<App />);
  expect(await screen.findByText("Carregando sua conta…")).toBeTruthy();
  expect(document.querySelector(".onboarding__welcome")).toBeNull();
  localStorage.setItem("helena.account.v1", "manual-owner");
  localStorage.setItem(
    "helena.onboarding.v1",
    JSON.stringify({
      completed: true,
      configurationOwner: "manual-owner",
      details: { name: "Original" },
    }),
  );
  vi.mocked(useCloudSync).mockReturnValue({
    enabled: true,
    ready: true,
    authenticated: true,
    status: "synced",
    revision: 2,
  });
  view.rerender(<App />);
  expect(await screen.findByRole("heading", { name: "Espaço do aluno" })).toBeTruthy();
  expect(document.querySelector(".onboarding")).toBeNull();
  expect(JSON.parse(localStorage.getItem("helena.onboarding.v1")!).details.name).toBe("Original");
});

it("opens onboarding for a genuinely new authenticated account after loading", async () => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.mocked(useCloudSync).mockReturnValue({
    enabled: true,
    ready: true,
    authenticated: true,
    status: "synced",
    revision: 1,
  });
  render(<App />);
  expect(await screen.findByText("Olá! Eu sou a Olena.", {}, { timeout: 5000 })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Espaço do aluno" })).toBeNull();
});

it("abre a capa, e não as perguntas, para um convidado antigo que nunca concluiu o onboarding", async () => {
  localStorage.clear();
  // A marca de convidado sobrevive em navegadores de quando existia "Entrar como convidado".
  localStorage.setItem("helena.guest.v1", "1");
  window.history.replaceState(null, "", "/");
  vi.mocked(useCloudSync).mockReturnValue({
    enabled: true,
    ready: true,
    authenticated: false,
    status: "signed-out",
    revision: 1,
  });
  render(<App />);
  expect(await screen.findByRole("heading", { name: "Estude do seu jeito" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Começar agora" })).toBeTruthy();
  expect(screen.queryByText("Olá! Eu sou a Olena.")).toBeNull();
});
