import { expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileAvatarDialog } from "./profile-avatar-dialog";
import { readStoredProfile } from "../hooks/use-stored-profile";
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
