import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  expect(screen.getAllByText("@oliver644")).toHaveLength(2);
  expect(screen.queryByText("@forjado")).toBeNull();
  expect(screen.getAllByLabelText("Selo CREKS")[0]?.className).toContain("profile-creks");
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
  expect(screen.getByRole("heading", { name: "Andreyna" })).toBeTruthy();
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
  expect(screen.getByRole("heading", { name: "Guest" })).toBeTruthy();
  expect(screen.queryByText("Nome anterior")).toBeNull();
  rerender(
    <ProfileShowcase nameFallback="Guest" guest settingsOpen>
      <button>Fechar configurações</button>
    </ProfileShowcase>,
  );
  expect(screen.queryByRole("region", { name: "Seu perfil" })).toBeNull();
  expect(screen.getByRole("button", { name: "Fechar configurações" })).toBeTruthy();
});

it("remove trajetória sem alterar as sessões reais do workspace", () => {
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
  expect(items).toHaveLength(0);
  expect(screen.queryByText("Sua trajetória")).toBeNull();
  expect(screen.getByRole("heading", { name: "O estudo que você já construiu" })).toBeTruthy();
  expect(JSON.stringify(workspace)).toBe(before);
});

it("não inventa atividade quando não há sessões", () => {
  const workspace = createInitialWorkspace();
  workspace.focusSessions = [];
  render(<ProfileOverview workspace={workspace} />);
  expect(screen.queryByText(/questionários concluídos vão aparecer aqui/)).toBeNull();
  expect(screen.queryByRole("list")).toBeNull();
  expect(screen.queryByRole("link", { name: "Ir para o foco" })).toBeNull();
});

it("preserva foco, Ilhas e questionários sem exibir a trajetória", () => {
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
  expect(items).toHaveLength(0);
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
  expect(container.querySelectorAll(".profile-activity li")).toHaveLength(0);
  expect(screen.queryByText("Questionário: 2 de 3 respostas certas")).toBeNull();
});

it("preenche o editor com o mesmo nome da conta exibido na capa", () => {
  render(
    <ProfileShowcase nameFallback="Nome da conta" settingsOpen={false}>
      {null}
    </ProfileShowcase>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Editar perfil" }));
  expect(screen.getByLabelText("Nome")).toHaveProperty("value", "Nome da conta");
});

it("barra compacta contém só identidade, com tag no nome e pronomes junto ao @", () => {
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Oli", pronouns: "Ele/dele", bio: "Bio fora da barra" }),
  );
  serverHandle.creks = true;
  const { container } = render(
    <ProfileShowcase nameFallback="Conta" settingsOpen={false}>
      {null}
    </ProfileShowcase>,
  );
  const compact = container.querySelector(".profile-compact-identity")!;
  expect(compact.children[0]?.textContent).toBe("Oli");
  expect(compact.querySelector(".profile-labels")?.textContent).toBe("CREKS");
  expect(compact.children[1]?.textContent).toBe("@oliEle/dele");
  expect(compact.querySelector("button, nav")).toBeNull();
  expect(compact.querySelector("img")?.getAttribute("src")).toBe("/profile-avatars/helena.webp");
  expect(compact.textContent).not.toContain("Bio fora da barra");
});

it("concede os rótulos extras só à identidade oliver644 confirmada pelo servidor", () => {
  localStorage.setItem("helena.profile.v1", JSON.stringify({ username: "oliver644", creks: true }));
  const { rerender } = render(
    <ProfileShowcase nameFallback="Conta" settingsOpen={false}>
      {null}
    </ProfileShowcase>,
  );
  expect(screen.queryByLabelText("Selo DEV")).toBeNull();
  serverHandle.username = "oliver644";
  serverHandle.creks = true;
  rerender(
    <ProfileShowcase nameFallback="Conta" settingsOpen={false}>
      {null}
    </ProfileShowcase>,
  );
  for (const label of ["CREKS", "DEV", "BETA TESTER", "GALAXIA"])
    expect(screen.getAllByLabelText(`Selo ${label}`)).toHaveLength(2);
});

it("concede CREKS e BETA TESTER ao @eito confirmado, sem herdar DEV ou GALAXIA", () => {
  localStorage.setItem("helena.profile.v1", JSON.stringify({ username: "eito" }));
  const { rerender } = render(
    <ProfileShowcase nameFallback="Conta" settingsOpen={false}>
      {null}
    </ProfileShowcase>,
  );
  expect(screen.queryByLabelText("Selo CREKS")).toBeNull();
  serverHandle.username = "eito";
  rerender(
    <ProfileShowcase nameFallback="Conta" settingsOpen={false}>
      {null}
    </ProfileShowcase>,
  );
  expect(screen.getAllByLabelText("Selo CREKS")).toHaveLength(2);
  expect(screen.getAllByLabelText("Selo BETA TESTER")).toHaveLength(2);
  expect(screen.queryByLabelText("Selo DEV")).toBeNull();
  expect(screen.queryByLabelText("Selo GALAXIA")).toBeNull();
});
