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
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  mocks.request.mockReset();
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
  await screen.findByText("Sua apresentação");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Buscar" }).hasAttribute("disabled")).toBe(false),
  );
  fireEvent.change(screen.getByLabelText("Buscar por nome ou @"), { target: { value: "bob" } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
  fireEvent.click(await screen.findByRole("button", { name: "Visitar perfil de @bob" }));
  fireEvent.click(await screen.findByRole("button", { name: "Seguir de volta" }));
  await screen.findByRole("button", { name: "Deixar de seguir" });
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
    screen.getByRole("img", { name: "QR code do perfil" }).querySelectorAll("path"),
  ).toHaveLength(2);
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
