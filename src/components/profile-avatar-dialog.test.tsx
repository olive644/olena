import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProfileAvatarDialog } from "./profile-avatar-dialog";
import { readStoredProfile } from "../hooks/use-stored-profile";
import { profileAvatarSource } from "../domain/profile-avatars";
it("só permite personagens e só grava na confirmação, preservando a identidade", () => {
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Oli", username: "oli", bio: "Bio" }),
  );
  const close = vi.fn();
  const { container } = render(<ProfileAvatarDialog onClose={close} />);
  expect(container.querySelector('input[type="file"]')).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Oliver" }));
  expect(screen.getByRole("button", { name: "Oliver" }).getAttribute("aria-pressed")).toBe("true");
  expect(readStoredProfile().photoUrl).toBeUndefined();
  fireEvent.click(screen.getByRole("button", { name: "Usar personagem" }));
  expect(readStoredProfile()).toMatchObject({
    name: "Oli",
    username: "oli",
    bio: "Bio",
    photoUrl: "/profile-avatars/oliver.webp",
  });
  expect(close).toHaveBeenCalledOnce();
});
it("não apresenta URL externa, data URL ou caminho arbitrário como avatar", () => {
  for (const value of [
    "https://example.com/foto.jpg",
    "data:image/png;base64,AAAA",
    "/profile-avatars/../foto.webp",
    "/profile-avatars/falso.webp",
  ])
    expect(profileAvatarSource(value)).toBe("/profile-avatars/helena.webp");
  expect(profileAvatarSource("/profile-avatars/andreyna.webp")).toBe(
    "/profile-avatars/andreyna.webp",
  );
});
it("cancelar não grava e quota conserva a janela e escolha", () => {
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ photoUrl: "/profile-avatars/helena.webp" }),
  );
  const close = vi.fn();
  render(<ProfileAvatarDialog onClose={close} />);
  fireEvent.click(screen.getByRole("button", { name: "Oliver" }));
  const setter = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  fireEvent.click(screen.getByRole("button", { name: "Usar personagem" }));
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(close).not.toHaveBeenCalled();
  expect(readStoredProfile().photoUrl).toBe("/profile-avatars/helena.webp");
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(close).toHaveBeenCalledOnce();
  setter.mockRestore();
});
