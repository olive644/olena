import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  // Primeiro teste do arquivo: paga o carregamento dos módulos do perfil em cache frio.
  const badge = await screen.findByLabelText("Nível 7", {}, { timeout: 5000 });
  expect(badge.classList.contains("profile-level-badge")).toBe(true);
  expect(badge.closest(".social-visit-avatar")).not.toBeNull();
  expect(screen.queryByRole("textbox", { name: "Buscar por nome ou @" })).toBeNull();
  // A insígnia existe antes do efeito que abre o dialog nativo.
  expect(await screen.findByRole("dialog", { name: "Perfil de @bob" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "GitHub" }).getAttribute("href")).toBe(
    "https://github.com/bob",
  );
  expect(
    [...document.querySelectorAll(".social-profile-streaks strong")]
      .map((node) => node.textContent)
      .sort(),
  ).toEqual(["2", "4"]);
  expect(document.querySelectorAll(".social-profile-streaks strong")).toHaveLength(2);
  expect(
    document
      .querySelector(".social-profile-name")
      ?.contains(document.querySelector(".social-profile-streaks")),
  ).toBe(true);
  const counts = document.querySelector(".social-profile-counts")!;
  expect(counts.previousElementSibling?.textContent).toBe("@bob");
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
it("voltar do perfil visitado retorna à lista de onde veio, e o X fecha tudo", async () => {
  const onClose = vi.fn();
  mocks.request.mockImplementation(async (_action, query) =>
    query?.includes("list=")
      ? {
          ...feed,
          connections: { kind: "followers", owner: "alice", people: [bob] },
        }
      : query === "username=bob"
        ? { ...feed, profile: bob }
        : feed,
  );
  render(<SocialDirectory initialList="followers" nameFallback="Alice" onClose={onClose} />);
  fireEvent.click(await screen.findByRole("button", { name: "Visitar perfil de @bob" }));
  const visit = await screen.findByRole("dialog", { name: "Perfil de @bob" });
  const header = visit.querySelector("header")!;
  const buttons = [...header.querySelectorAll("button")];
  expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual(["Voltar", "Fechar"]);
  fireEvent.click(buttons[0]!);
  expect(await screen.findByRole("button", { name: "Visitar perfil de @bob" })).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button", { name: "Visitar perfil de @bob" }));
  fireEvent.click(
    within(await screen.findByRole("dialog", { name: "Perfil de @bob" })).getByRole("button", {
      name: "Fechar",
    }),
  );
  expect(onClose).toHaveBeenCalledTimes(1);
});
it("perfil aberto por link não oferece voltar, só fechar", async () => {
  mocks.request.mockResolvedValue({ ...feed, profile: bob });
  render(<SocialDirectory initialUsername="bob" nameFallback="Alice" onClose={vi.fn()} />);
  await screen.findAllByRole("heading", { name: "Bob" });
  const visit = screen.getByRole("dialog", { name: "Perfil de @bob" });
  expect(within(visit).queryByRole("button", { name: "Voltar" })).toBeNull();
  expect(within(visit).getByRole("button", { name: "Fechar" })).toBeTruthy();
});
it("cartão próprio mostra nível, etiquetas e destaques, com ações só de ícone", async () => {
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn() } });
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({
      name: "Oliver",
      achievementFavorites: ["correct-10", "general-pomodoro-gold"],
    }),
  );
  mocks.request.mockResolvedValue({
    ...feed,
    self: {
      ...alice,
      username: "oliver644",
      achievements: ["correct-10", "general-pomodoro-gold", "correct-1"],
    },
  });
  render(<SocialDirectory initialSharing nameFallback="Alice" onClose={vi.fn()} />);
  const card = (await screen.findByLabelText("QR code do perfil")).closest(
    ".social-share-card",
  ) as HTMLElement;
  expect(
    within(card)
      .getByLabelText(/^Nível \d+$/)
      .closest(".social-share-avatar"),
  ).not.toBeNull();
  expect([...card.querySelectorAll(".profile-creks")].map((tag) => tag.textContent)).toEqual([
    "CREKS",
    "DEV",
    "BETA TESTER",
    "GALAXIA",
  ]);
  const highlights = within(card).getByLabelText("Destaques do perfil");
  expect(highlights.querySelectorAll(".math-achievement-art")).toHaveLength(2);
  expect(highlights.querySelector("image")?.getAttribute("href")).toContain("/thumb/");
  const actions = card.parentElement!.querySelector(".social-share-actions")!;
  for (const button of actions.querySelectorAll("button")) {
    expect(button.textContent?.trim()).toBe("");
    expect(button.getAttribute("aria-label")).toBeTruthy();
  }
  expect(within(actions as HTMLElement).getByRole("button", { name: "Copiar link" })).toBeTruthy();
  expect(
    within(actions as HTMLElement).getByRole("button", { name: "Salvar cartão" }),
  ).toBeTruthy();
});
it("cartão sem destaques escolhidos não reserva espaço para eles", async () => {
  mocks.request.mockResolvedValue({ ...feed, self: { ...alice, achievements: ["correct-1"] } });
  render(<SocialDirectory initialSharing nameFallback="Alice" onClose={vi.fn()} />);
  await screen.findByLabelText("QR code do perfil");
  expect(document.querySelector(".social-share-highlights")).toBeNull();
});
it("inspeção mostra logo abaixo do nome só os destaques que a pessoa escolheu", async () => {
  mocks.request.mockResolvedValue({
    ...feed,
    profile: {
      ...bob,
      achievements: ["correct-1", "correct-10", "general-pomodoro-gold"],
      achievementFavorites: ["general-pomodoro-gold", "correct-10"],
    },
  });
  render(<SocialDirectory initialUsername="bob" nameFallback="Alice" onClose={vi.fn()} />);
  await screen.findAllByRole("heading", { name: "Bob" });
  const profile = document.querySelector(".social-profile")!;
  const tiles = [...profile.querySelectorAll(".achievement-tile")];
  expect(tiles).toHaveLength(2);
  expect(tiles[0]?.querySelector("image")?.getAttribute("href")).toContain("general-pomodoro-gold");
  expect(profile.querySelector(".achievement-empty")).toBeNull();
  const streaks = profile.querySelector(".social-profile-streaks")!;
  expect(
    streaks.compareDocumentPosition(tiles[0]!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
it("inspeção não inventa destaques quando a pessoa não escolheu nenhum", async () => {
  mocks.request.mockResolvedValue({
    ...feed,
    profile: { ...bob, achievements: ["correct-1", "correct-10"] },
  });
  render(<SocialDirectory initialUsername="bob" nameFallback="Alice" onClose={vi.fn()} />);
  await screen.findAllByRole("heading", { name: "Bob" });
  expect(document.querySelectorAll(".social-profile .achievement-tile")).toHaveLength(0);
});
