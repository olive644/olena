import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProfileOverview, ProfileShowcase } from "./profile-showcase";
import { createInitialWorkspace } from "../domain/workspace";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
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
  expect(container.querySelector(".profile-cover__art")?.getAttribute("src")).toBe(
    "/room-art/profile-heads.webp",
  );
});

it("mantém dados opcionais na barra, redes somente por ícones e zero conexões iniciais", () => {
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
  expect(screen.getByLabelText("Conexões do perfil").textContent).toBe("0 Seguidores0 Seguindo");
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
  expect(screen.getByText(/As sessões concluídas vão aparecer aqui/)).toBeTruthy();
  expect(screen.queryByRole("list")).toBeNull();
  expect(screen.getByRole("link", { name: "Ir para o foco" }).getAttribute("href")).toBe("/foco");
});
