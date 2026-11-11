import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { ProfileShareCard } from "./profile-share-card";
import type { SocialProfile } from "../domain/profile-social";
vi.mock("../data/achievement-png", () => ({ inlineAchievementArt: vi.fn() }));
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

it("inclui header, fundo e moldura do perfil no cartão", () => {
  const person: SocialProfile = {
    username: "cosmeticos",
    name: "Cosméticos",
    photoUrl: "/profile-avatars/oliver.webp",
    followers: 0,
    following: 0,
    followsYou: false,
    followed: false,
    shared: true,
    cover: "mathematics",
    details: {
      level: 4,
      streaks: { pomodoro: 0, timer: 0, islands: 0 },
      socialLinks: [],
      frame: "bi",
      background: "trans",
    },
  };
  const { container } = render(<ProfileShareCard person={person} />);
  expect(
    container.querySelector(".social-share-card")?.getAttribute("data-profile-background"),
  ).toBe("trans");
  expect(container.querySelector(".social-share-cover img")?.getAttribute("src")).toBe(
    "/profile-covers/mathematics.svg",
  );
  expect(
    container.querySelector(".social-share-avatar .profile-frame-art")?.getAttribute("src"),
  ).toBe("/profile-cosmetics/bi.svg");
});

it("exportação PNG desenha o fundo e a moldura escolhidos junto ao header", async () => {
  const drawn: string[] = [];
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
  class DecodedImage {
    src = "";
    naturalWidth = 1200;
    naturalHeight = 320;
    async decode() {}
  }
  vi.stubGlobal("Image", DecodedImage);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ text: async () => '<svg xmlns="http://www.w3.org/2000/svg"/>' })),
  );
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:profile-test"),
      revokeObjectURL: vi.fn(),
    }),
  );
  const context = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    measureText: () => ({ width: 30 }),
    drawImage: (image: DecodedImage) => drawn.push(image.src),
  };
  const canvas = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue(context as unknown as CanvasRenderingContext2D);
  const blob = vi
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation((callback) => callback(new Blob(["png"], { type: "image/png" })));
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const person: SocialProfile = {
    username: "exportacao",
    name: "Exportação",
    photoUrl: "/profile-avatars/oliver.webp",
    followers: 0,
    following: 0,
    followsYou: false,
    followed: false,
    shared: true,
    cover: "mathematics",
    details: {
      level: 4,
      streaks: { pomodoro: 0, timer: 0, islands: 0 },
      socialLinks: [],
      frame: "bi",
      background: "trans",
    },
  };
  const { unmount } = render(<ProfileShareCard person={person} />);
  fireEvent.click(screen.getByRole("button", { name: "Salvar cartão" }));
  await waitFor(() => expect(click).toHaveBeenCalledOnce());
  expect(drawn).toEqual(
    expect.arrayContaining([
      "/profile-covers/mathematics.svg",
      "/profile-cosmetics/background-trans.svg",
      "/profile-cosmetics/bi.svg",
    ]),
  );
  expect(drawn.indexOf("/profile-cosmetics/background-trans.svg")).toBeLessThan(
    drawn.indexOf("/profile-cosmetics/bi.svg"),
  );
  unmount();
  canvas.mockRestore();
  blob.mockRestore();
  click.mockRestore();
  vi.unstubAllGlobals();
});

it("exportação PNG continua baixando quando um enfeite não carrega", async () => {
  const drawn: string[] = [];
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
  // Fundo, moldura e o número do nível são imagens extras: se o aparelho não conseguir
  // decodificá-las (ou o logo do QR não baixar), o cartão sai mesmo assim, sem elas.
  class DecodedImage {
    src = "";
    naturalWidth = 1200;
    naturalHeight = 320;
    async decode() {
      if (this.src.includes("/profile-cosmetics/") || this.src.startsWith("data:image/svg+xml"))
        throw new DOMException("indisponível", "EncodingError");
    }
  }
  vi.stubGlobal("Image", DecodedImage);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }),
  );
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:profile-test"),
      revokeObjectURL: vi.fn(),
    }),
  );
  const context = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    measureText: () => ({ width: 30 }),
    drawImage: (image: DecodedImage) => drawn.push(image.src),
  };
  const canvas = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue(context as unknown as CanvasRenderingContext2D);
  const blob = vi
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation((callback) => callback(new Blob(["png"], { type: "image/png" })));
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const person: SocialProfile = {
    username: "enfeites",
    name: "Enfeites",
    photoUrl: "/profile-avatars/oliver.webp",
    followers: 0,
    following: 0,
    followsYou: false,
    followed: false,
    shared: true,
    cover: "mathematics",
    details: {
      level: 4,
      streaks: { pomodoro: 0, timer: 0, islands: 0 },
      socialLinks: [],
      frame: "bi",
      background: "trans",
    },
  };
  const { unmount } = render(<ProfileShareCard person={person} />);
  fireEvent.click(screen.getByRole("button", { name: "Salvar cartão" }));
  await waitFor(() => expect(click).toHaveBeenCalledOnce());
  expect(drawn).toContain("/profile-covers/mathematics.svg");
  expect(drawn).not.toContain("/profile-cosmetics/bi.svg");
  expect((await screen.findByRole("status")).textContent).toBe("Cartão salvo.");
  expect(warn).toHaveBeenCalled();
  unmount();
  canvas.mockRestore();
  blob.mockRestore();
  click.mockRestore();
  warn.mockRestore();
  vi.unstubAllGlobals();
});
