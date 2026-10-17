import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProfileOverview, ProfileShowcase } from "./profile-showcase";
import { createInitialWorkspace } from "../domain/workspace";
const serverHandle = vi.hoisted(() => ({ username: "oli", creks: false }));
vi.mock("../hooks/use-profile-handle", () => ({
  useProfileHandle: (guest: boolean) => ({
    handle: guest ? { username: "", creks: false } : serverHandle,
    refresh: vi.fn(),
  }),
}));

afterEach(() => {
  serverHandle.username = "oli";
  serverHandle.creks = false;
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
it("mostra CREKS apenas da identidade do servidor, não de campos locais", () => {
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Oli", username: "forjado", creks: true }),
  );
  serverHandle.username = "oliver644";
  serverHandle.creks = true;
  const { rerender } = render(
    <ProfileShowcase nameFallback="Aluno" settingsOpen={false}>
      {null}
    </ProfileShowcase>,
  );
  expect(screen.getByText("@oliver644")).toBeTruthy();
  expect(screen.queryByText("@forjado")).toBeNull();
  expect(screen.getByLabelText("Selo CREKS").className).toBe("profile-creks");
  serverHandle.creks = false;
  rerender(
    <ProfileShowcase nameFallback="Aluno" settingsOpen={false}>
      {null}
    </ProfileShowcase>,
  );
  expect(screen.queryByLabelText("Selo CREKS")).toBeNull();
});

it("mostra identidade real com capa compartilhada e uma só foto", () => {
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Andreyna", photoUrl: "/profile-avatars/andreyna.webp" }),
  );
  const { container } = render(
    <ProfileShowcase nameFallback="Aluno" settingsOpen={false}>
      <button>Configurações</button>
    </ProfileShowcase>,
  );
  expect(screen.getByText("Andreyna")).toBeTruthy();
  expect(screen.getByRole("img", { name: "Sua foto de perfil" }).getAttribute("src")).toBe(
    "/profile-avatars/andreyna.webp",
  );
  expect(container.querySelectorAll(".profile-cover__avatar")).toHaveLength(1);
  expect(container.querySelector(".profile-cover__art img")?.getAttribute("data-cover")).toBe(
    "helena",
  );
});

it("mantém dados opcionais, redes e os contadores sociais solicitados", () => {
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({
      name: "Oli",
      username: "oli",
      pronouns: "Ele/dele",
      bio: "Uma descoberta",
      socialLinks: ["https://github.com/oli", "javascript:alert(1)"],
    }),
  );
  const { container } = render(
    <ProfileShowcase nameFallback="Aluno" settingsOpen={false}>
      <button>Configurações</button>
    </ProfileShowcase>,
  );
  expect(container.querySelector(".profile-cover__handle")?.textContent).toBe("@oliEle/dele");
  expect(container.querySelector(".profile-cover__bio")?.textContent).toBe("Uma descoberta");
  const link = screen.getByRole("link", { name: "GitHub" });
  expect(link.textContent).toBe("");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.getByLabelText("Conexões do perfil").textContent).toContain(
    "0 Seguidores0 Seguindo",
  );
  expect(container.querySelector(".profile-about")).toBeNull();
});

it("conserva nome Guest e mantém ações quando configurações abrem", () => {
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Nome anterior" }));
  const { rerender } = render(
    <ProfileShowcase nameFallback="Guest" guest settingsOpen={false}>
      <button>Configurações</button>
    </ProfileShowcase>,
  );
  expect(screen.getByText("Guest")).toBeTruthy();
  expect(screen.queryByText("Nome anterior")).toBeNull();
  rerender(
    <ProfileShowcase nameFallback="Guest" guest settingsOpen>
      <button>Fechar configurações</button>
    </ProfileShowcase>,
  );
  expect(screen.queryByRole("region", { name: "Seu perfil" })).toBeNull();
  expect(screen.getByRole("button", { name: "Fechar configurações" })).toBeTruthy();
});

it("mostra somente as cinco sessões reais mais recentes sem alterar workspace", () => {
  const workspace = createInitialWorkspace();
  workspace.focusSessions = Array.from({ length: 7 }, (_, index) => ({
    id: String(index),
    subjectId: workspace.subjects[0]!.id,
    durationMinutes: index + 20,
    completedAt: `2026-10-${10 + index}T12:00:00Z`,
  }));
  const before = JSON.stringify(workspace);
  const { container } = render(<ProfileOverview workspace={workspace} />);
  const items = container.querySelectorAll(".profile-activity li");
  expect(items).toHaveLength(5);
  expect(items[0]?.textContent).toContain("26 min de foco");
  expect(JSON.stringify(workspace)).toBe(before);
});

it("não inventa atividade quando não há sessões", () => {
  const workspace = createInitialWorkspace();
  workspace.focusSessions = [];
  render(<ProfileOverview workspace={workspace} />);
  expect(screen.getByText(/questionários concluídos vão aparecer aqui/)).toBeTruthy();
  expect(screen.queryByRole("list")).toBeNull();
  expect(screen.getByRole("link", { name: "Ir para o foco" }).getAttribute("href")).toBe("/foco");
});

it("intercala foco, Ilhas e questionários por instante, com limite global de cinco", () => {
  const workspace = createInitialWorkspace();
  const subjectId = workspace.subjects[0]!.id;
  workspace.focusSessions = Array.from({ length: 5 }, (_, index) => ({
    id: String(index),
    subjectId,
    durationMinutes: 25,
    completedAt: `2026-10-${10 + index}T12:00:00Z`,
  }));
  workspace.practiceActivities = [
    {
      id: "0",
      islandId: "math",
      islandName: "Matemática",
      completedAt: "2026-10-16T12:00:00Z",
      answers: 10,
      correct: 8,
    },
  ];
  workspace.quizAttempts = [
    {
      id: "0",
      subjectId: "removed",
      completedAt: "2026-10-16T14:00:00+03:00",
      correct: 0,
      total: 4,
    },
  ];
  const before = JSON.stringify(workspace);
  const { container } = render(<ProfileOverview workspace={workspace} />);
  const items = container.querySelectorAll(".profile-activity li");
  expect(items).toHaveLength(5);
  expect(items[0]?.textContent).toContain("MatemáticaPrática nas Ilhas: 8 de 10 respostas certas");
  expect(items[1]?.textContent).toContain("EstudoQuestionário: 0 de 4 respostas certas");
  expect(items[2]?.textContent).toContain("25 min de foco");
  expect(JSON.stringify(workspace)).toBe(before);
});

it("mostra questionário sem foco e aceita workspace antigo sem práticas", () => {
  const workspace = createInitialWorkspace();
  workspace.focusSessions = [];
  delete workspace.practiceActivities;
  workspace.quizAttempts = [
    {
      id: "valid",
      subjectId: "removed",
      completedAt: "2026-10-16T12:00:00Z",
      correct: 2,
      total: 3,
    },
  ];
  const { container } = render(<ProfileOverview workspace={workspace} />);
  expect(container.querySelectorAll(".profile-activity li")).toHaveLength(1);
  expect(screen.getByText("Questionário: 2 de 3 respostas certas")).toBeTruthy();
});
