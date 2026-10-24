import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SocialDirectory } from "./profile-social";
import type { SocialFeed, SocialProfile } from "../domain/profile-social";
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../data/profile-social", () => ({
  requestSocial: mocks.request,
  SOCIAL_VISIT: "olena:social-visit",
}));
const alice: SocialProfile = {
  username: "alice",
  name: "Alice",
  photoUrl: "/profile-avatars/alice.svg",
  followers: 1,
  following: 0,
  followsYou: false,
  followed: false,
  shared: true,
};
const bob: SocialProfile = { ...alice, username: "bob", name: "Bob", followsYou: true };
const feed: SocialFeed = { self: alice, notifications: [], suggestions: [] };
it("inspeção mostra nível, streak e redes, mas deixa atividades somente no sino", async () => {
  mocks.request.mockResolvedValue({
    ...feed,
    profile: {
      ...bob,
      details: {
        level: 7,
        streaks: { islands: 4, pomodoro: 0, timer: 2 },
        socialLinks: ["https://github.com/bob"],
        updatedAt: Date.now(),
      },
    },
    activities: [
      {
        id: "a".repeat(32),
        person: bob,
        kind: "focus",
        value: 400,
        at: Date.now(),
        liked: false,
        likes: [],
      },
    ],
  });
  render(<SocialDirectory initialUsername="bob" nameFallback="Alice" onClose={vi.fn()} />);
  const badge = await screen.findByLabelText("Nível 7");
  expect(badge.classList.contains("profile-level-badge")).toBe(true);
  expect(badge.closest(".social-visit-avatar")).not.toBeNull();
  expect(screen.queryByRole("textbox", { name: "Buscar por nome ou @" })).toBeNull();
  expect(screen.getByRole("dialog", { name: "Perfil de @bob" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "GitHub" }).getAttribute("href")).toBe(
    "https://github.com/bob",
  );
  expect(
    [...document.querySelectorAll(".social-profile-streaks strong")]
      .map((node) => node.textContent)
      .sort(),
  ).toEqual(["2", "4"]);
  expect(document.querySelectorAll(".social-profile-streaks strong")).toHaveLength(2);
  expect(screen.queryByText(/400/)).toBeNull();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  mocks.request.mockReset();
});

it("abre diretamente o cartão pelo atalho de QR", async () => {
  mocks.request.mockResolvedValue(feed);
  render(<SocialDirectory initialSharing nameFallback="Alice" onClose={vi.fn()} />);
  await screen.findByRole("heading", { name: "Compartilhar perfil" });
  await screen.findByLabelText("QR code do perfil");
  expect(screen.getByRole("button", { name: "Copiar link" })).toBeTruthy();
});

it("busca, visita um perfil e segue de volta com resultado real da API", async () => {
  mocks.request.mockImplementation(async (action, query) =>
    action
      ? { ...feed, profile: { ...bob, followed: true } }
      : query === "search=bob"
        ? { ...feed, results: [bob] }
        : query === "username=bob"
          ? { ...feed, profile: bob }
          : feed,
  );
  render(<SocialDirectory nameFallback="Alice" onClose={vi.fn()} />);
  await screen.findByRole("heading", { name: "Sugestões de amigos" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Buscar" }).hasAttribute("disabled")).toBe(false),
  );
  fireEvent.change(screen.getByLabelText("Buscar por nome ou @"), { target: { value: "bob" } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
  fireEvent.click(await screen.findByRole("button", { name: "Visitar perfil de @bob" }));
  fireEvent.click(await screen.findByRole("button", { name: "Seguir de volta" }));
  await screen.findByRole("button", { name: /^Seguindo$/ });
  expect(mocks.request).toHaveBeenCalledWith({ action: "follow", username: "bob" });
});
it("compartilha cartão com identidade local, QR real e link de visita, sem publicar implicitamente", async () => {
  const copy = vi.fn(async () => {});
  vi.stubGlobal("navigator", { clipboard: { writeText: copy } });
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Alice do estudo", photoUrl: "/profile-avatars/oliver.webp" }),
  );
  mocks.request.mockResolvedValue({ ...feed, self: { ...alice, shared: false } });
  render(<SocialDirectory nameFallback="Alice" onClose={vi.fn()} />);
  const open = await screen.findByRole("button", { name: "Compartilhar perfil" });
  await waitFor(() => expect(open.hasAttribute("disabled")).toBe(false));
  fireEvent.click(open);
  expect(screen.getByRole("heading", { name: "Alice do estudo" })).toBeTruthy();
  expect(screen.getByRole("img", { name: "Avatar de Alice do estudo" }).getAttribute("src")).toBe(
    "/profile-avatars/oliver.webp",
  );
  expect(
    screen.getByRole("img", { name: "QR code do perfil" }).querySelectorAll("[data-qr-finder]"),
  ).toHaveLength(3);
  expect(screen.queryByLabelText("Link do perfil")).toBeNull();
  expect(screen.queryByText("Sua apresentação")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
  await screen.findByText("Link copiado.");
  expect(copy).toHaveBeenCalledWith(expect.stringContaining("/perfil?usuario=alice"));
  expect(mocks.request).toHaveBeenCalledTimes(1);
});
it("contatos preenchem apenas o nome escolhido, sem enviar a agenda automaticamente", async () => {
  const select = vi.fn(async () => [{ name: ["Bob Silva"] }]);
  vi.stubGlobal("navigator", { contacts: { select } });
  mocks.request.mockResolvedValue(feed);
  render(<SocialDirectory nameFallback="Alice" onClose={vi.fn()} />);
  const contacts = await screen.findByRole("button", { name: "Escolher nos contatos" });
  await waitFor(() => expect(contacts.hasAttribute("disabled")).toBe(false));
  fireEvent.click(contacts);
  await screen.findByText(/Nome selecionado/);
  expect(screen.getByLabelText("Buscar por nome ou @")).toHaveProperty("value", "Bob Silva");
  expect(select).toHaveBeenCalledWith(["name"], { multiple: false });
  expect(mocks.request).toHaveBeenCalledTimes(1);
});
it("não inventa sugestões nem apresenta erro técnico quando a conta está indisponível", async () => {
  mocks.request.mockRejectedValue(new Error("Entre na conta para adicionar amigos."));
  render(<SocialDirectory nameFallback="Alice" onClose={vi.fn()} />);
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Entre na conta para adicionar amigos.",
  );
  expect(screen.queryByText("Talvez vocês se conheçam")).toBeNull();
});
it("abre seguidores, visita e confirma a remoção antes de alterar a conexão", async () => {
  mocks.request.mockImplementation(async (action, query) =>
    action
      ? feed
      : {
          ...feed,
          connections: {
            kind: "followers",
            owner: "alice",
            people: query?.includes("offset") ? [] : [bob],
          },
        },
  );
  render(<SocialDirectory initialList="followers" nameFallback="Alice" onClose={vi.fn()} />);
  await screen.findByRole("button", { name: "Visitar perfil de @bob" });
  const person = screen.getByRole("button", { name: "Visitar perfil de @bob" });
  const identity = person.querySelector("span")!;
  expect(identity.querySelector("strong")?.title).toBe("Bob");
  expect(identity.querySelector("small")?.title).toBe("@bob");
  expect(identity.querySelector(".social-person-relation")?.textContent).toBe("Segue você");
  expect(person.children).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: /^Remover$/ }));
  expect(mocks.request).not.toHaveBeenCalledWith({ action: "remove-follower", username: "bob" });
  fireEvent.click(screen.getByRole("button", { name: "Remover seguidor" }));
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith({ action: "remove-follower", username: "bob" }),
  );
});
