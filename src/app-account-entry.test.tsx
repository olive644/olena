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

it("não volta ao onboarding uma conta com progresso na nuvem a que falta a marca de conclusão", async () => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  localStorage.setItem("helena.account.v1", "uid-com-progresso");
  // Estado que a nuvem entregou: pontos e acertos reais, mas sem "helena.onboarding.v1".
  localStorage.setItem(
    "helena.mathPlaceRewards.v1",
    JSON.stringify({ foundations: { points: 3644, receipts: ["math:foundations:aaa"] } }),
  );
  localStorage.setItem(
    "helena.mathGame.v5",
    JSON.stringify({ foundations: { level: 3, correct: 123, solved: [8255455] } }),
  );
  vi.mocked(useCloudSync).mockReturnValue({
    enabled: true,
    ready: true,
    authenticated: true,
    status: "synced",
    revision: 3,
  });
  render(<App />);
  expect(await screen.findByRole("heading", { name: "Espaço do aluno" })).toBeTruthy();
  expect(document.querySelector(".onboarding")).toBeNull();
  expect(screen.queryByText("Olá! Eu sou a Olena.")).toBeNull();
  // A marca é regravada para o próximo aparelho, com a conta dona.
  const record = JSON.parse(localStorage.getItem("helena.onboarding.v1")!);
  expect(record.completed).toBe(true);
  expect(record.configurationOwner).toBe("uid-com-progresso");
});

it("mostra o onboarding a uma conta nova mesmo com chaves de progresso vazias", async () => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  localStorage.setItem("helena.account.v1", "uid-novo");
  localStorage.setItem(
    "helena.mathPlaceRewards.v1",
    JSON.stringify({ foundations: { points: 0, receipts: [] } }),
  );
  vi.mocked(useCloudSync).mockReturnValue({
    enabled: true,
    ready: true,
    authenticated: true,
    status: "synced",
    revision: 1,
  });
  render(<App />);
  expect(await screen.findByText("Olá! Eu sou a Olena.", {}, { timeout: 5000 })).toBeTruthy();
});
