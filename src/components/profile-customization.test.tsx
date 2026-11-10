import { expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileAvatarDialog } from "./profile-avatar-dialog";
import { readStoredProfile } from "../hooks/use-stored-profile";
import { ENGLISH_PROGRESS_KEY } from "../domain/english-progress-ledger";
it("bandeiras são livres, exclusivos ficam bloqueados e cancelar não altera o perfil", () => {
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Oli", photoUrl: "/profile-avatars/oliver.webp" }),
  );
  const { unmount } = render(<ProfileAvatarDialog onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Molduras" }));
  const locked = screen.getByRole("button", { name: /Guardião dos números/ });
  expect(locked.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(locked);
  fireEvent.click(screen.getByRole("button", { name: "Bissexual" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(readStoredProfile().frame).toBeUndefined();
  unmount();
});
it("salva moldura e fundo juntos preservando edições concorrentes", () => {
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Oli" }));
  render(<ProfileAvatarDialog onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Molduras" }));
  fireEvent.click(screen.getByRole("button", { name: "Trans" }));
  fireEvent.click(screen.getByRole("button", { name: "Fundo do perfil" }));
  fireEvent.click(screen.getByRole("button", { name: "Caderno geométrico" }));
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Nome atualizado", bio: "Nova bio" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar personalização" }));
  expect(readStoredProfile()).toMatchObject({
    name: "Nome atualizado",
    bio: "Nova bio",
    frame: "trans",
    background: "geometry",
  });
  expect(readStoredProfile().photoUrl).toBeUndefined();
});

it("oferece as doze bandeiras também como fundo e protege o fundo matemático", () => {
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Oli" }));
  const { unmount } = render(
    <ProfileAvatarDialog onClose={vi.fn()} initialCategory="background" />,
  );
  for (const name of [
    "Orgulho LGBT",
    "Lésbica",
    "Gay",
    "Bissexual",
    "Trans",
    "Pansexual",
    "Não binárie",
    "Assexual",
    "Arromântica",
    "Agênero",
    "Gênero fluido",
    "Intersexo",
  ])
    expect(screen.getByRole("button", { name }).getAttribute("aria-disabled")).toBe("false");
  expect(
    screen.getByRole("button", { name: /Guardião dos números/ }).getAttribute("aria-disabled"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Bissexual" }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar personalização" }));
  expect(readStoredProfile().background).toBe("bi");
  unmount();
});

it("offers Teco freely and locks English cosmetics without English progress", () => {
  localStorage.removeItem(ENGLISH_PROGRESS_KEY);
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Oli" }));
  const { unmount } = render(<ProfileAvatarDialog onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Teco", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Molduras", exact: true }));
  const frame = screen.getByRole("button", { name: /Guardião das palavras/ });
  expect(frame.getAttribute("aria-disabled")).toBe("true");
  fireEvent.click(frame);
  fireEvent.click(screen.getByRole("button", { name: "Salvar personalização" }));
  expect(readStoredProfile().photoUrl).toBe("/profile-avatars/teco.webp");
  expect(readStoredProfile().frame).toBeUndefined();
  unmount();
});

it("saves English cosmetics earned from the ledger and rechecks them at save time", () => {
  const solved = Array.from({ length: 100 }, (_, index) => index);
  localStorage.setItem(
    ENGLISH_PROGRESS_KEY,
    JSON.stringify({ english: Array.from({ length: 8 }, () => ({ solved, confirmed: true })) }),
  );
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Oli" }));
  const { unmount } = render(<ProfileAvatarDialog onClose={vi.fn()} initialCategory="frame" />);
  const frame = screen.getByRole("button", { name: "Guardião das palavras", exact: true });
  expect(frame.getAttribute("aria-disabled")).toBe("false");
  fireEvent.click(frame);
  fireEvent.click(screen.getByRole("button", { name: "Headers", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Horizonte das palavras", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Fundo do perfil", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Guardião das palavras", exact: true }));
  localStorage.removeItem(ENGLISH_PROGRESS_KEY);
  fireEvent.click(screen.getByRole("button", { name: "Salvar personalização" }));
  expect(readStoredProfile()).toMatchObject({
    frame: "none",
    cover: "helena",
    background: "paper",
  });
  unmount();
});
