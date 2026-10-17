import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProfileCoverDialog } from "./profile-cover-dialog";
import { readStoredProfile } from "../hooks/use-stored-profile";
import { profileCover } from "../domain/profile-covers";

it("oferece cinco capas, cancelar não grava e salvar preserva a ficha atual", () => {
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Oli", cover: "forest" }));
  const close = vi.fn();
  const { rerender } = render(<ProfileCoverDialog onClose={close} />);
  expect(
    screen.getByRole("group", { name: "Temas de capa" }).querySelectorAll("button"),
  ).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: "Oceano" }));
  expect(screen.getByRole("button", { name: "Oceano" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(readStoredProfile().cover).toBe("forest");
  rerender(<ProfileCoverDialog key="again" onClose={close} />);
  fireEvent.click(screen.getByRole("button", { name: "Aurora" }));
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Novo nome", photoUrl: "/original.webp", bio: "Bio" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Usar capa" }));
  expect(readStoredProfile()).toMatchObject({
    name: "Novo nome",
    photoUrl: "/original.webp",
    bio: "Bio",
    cover: "aurora",
  });
});

it("mantém a seleção e avisa quando falha o armazenamento", () => {
  render(<ProfileCoverDialog onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Eclipse Solar" }));
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Quota");
  });
  fireEvent.click(screen.getByRole("button", { name: "Usar capa" }));
  expect(screen.getByRole("alert").textContent).toContain("Sua escolha continua aqui");
  expect(screen.getByRole("button", { name: "Eclipse Solar" }).getAttribute("aria-pressed")).toBe(
    "true",
  );
  write.mockRestore();
});

it("capa legada ou desconhecida usa Helena sem apagar os demais campos", () => {
  expect(profileCover(undefined)).toBe("helena");
  expect(profileCover("https://untrusted.example/image.svg")).toBe("helena");
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Oli", cover: { unsafe: true } }),
  );
  expect(readStoredProfile()).toEqual({ name: "Oli", cover: "helena" });
});
