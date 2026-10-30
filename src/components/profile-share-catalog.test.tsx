import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { ProfileShareCard } from "./profile-share-card";
import type { SocialProfile } from "../domain/profile-social";
const mocks = vi.hoisted(() => ({ ready: false, retry: vi.fn() }));
vi.mock("../data/arcana-catalog", async () => {
  const original =
    await vi.importActual<typeof import("../data/arcana-catalog")>("../data/arcana-catalog");
  const cards = await import("../../public/arcana/catalog.json");
  return {
    ...original,
    useArcanaCatalog: () => ({
      cards: mocks.ready ? cards.default : [],
      error: !mocks.ready,
      retry: mocks.retry,
    }),
  };
});
it("bloqueia PNG até o catálogo disponibilizar frentes e oferece recuperação do erro", () => {
  const person: SocialProfile = {
    username: "teste",
    name: "Perfil de teste",
    photoUrl: "/profile-avatars/helena.webp",
    followers: 0,
    following: 0,
    followsYou: false,
    followed: false,
    shared: true,
    cards: ["major-17"],
    cardFavorites: ["major-17"],
  };
  const { rerender } = render(<ProfileShareCard person={person} />);
  expect(screen.getByRole("button", { name: "Salvar cartão" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(mocks.retry).toHaveBeenCalled();
  mocks.ready = true;
  rerender(<ProfileShareCard person={person} />);
  expect(screen.getByRole("button", { name: "Salvar cartão" }).hasAttribute("disabled")).toBe(
    false,
  );
  // O mock troca um valor externo, sem a assinatura real de OliverCard. A decodificação das
  // frentes e o canvas limpo são conferidos no navegador; aqui a regressão é o bloqueio do botão.
});
