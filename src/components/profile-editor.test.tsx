import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProfileEditor } from "./profile-editor";
import { readStoredProfile } from "../hooks/use-stored-profile";
import { ProfileIdentity } from "./profile-preferences";

it("salva campos juntos, normaliza nome e rede, preserva foto e dados existentes", () => {
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Oli", photoUrl: "/original.webp" }),
  );
  const close = vi.fn();
  render(<ProfileEditor profile={readStoredProfile()} guest={false} onClose={close} />);
  fireEvent.change(screen.getByLabelText("Apelido"), { target: { value: "Oliver" } });
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "OLI_ESTUDA" } });
  expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("oli_estuda");
  fireEvent.change(screen.getByLabelText("Bio"), { target: { value: "Estudando matemática" } });
  fireEvent.change(screen.getByLabelText("Rede social 1"), { target: { value: "github.com/oli" } });
  expect(screen.getByText("GitHub")).toBeTruthy();
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Oli", photoUrl: "/new.webp" }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
  expect(readStoredProfile()).toMatchObject({
    name: "Oliver",
    username: "oli_estuda",
    bio: "Estudando matemática",
    photoUrl: "/new.webp",
    socialLinks: ["https://github.com/oli"],
  });
  expect(close).toHaveBeenCalledOnce();
});
it("cancelar não altera o perfil e erro de armazenamento mantém o rascunho", () => {
  const saved = JSON.stringify({ name: "Oli" });
  localStorage.setItem("helena.profile.v1", saved);
  const close = vi.fn();
  render(<ProfileEditor profile={readStoredProfile()} guest={false} onClose={close} />);
  fireEvent.change(screen.getByLabelText("Apelido"), { target: { value: "Outro" } });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Quota");
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
  expect(screen.getByRole("alert").textContent).toMatch(/continuam aqui/);
  expect(close).not.toHaveBeenCalled();
  expect(localStorage.getItem("helena.profile.v1")).toBe(saved);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(close).toHaveBeenCalledOnce();
  vi.restoreAllMocks();
});
it("não grava link inválido nem descarta o rascunho", () => {
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Oli" }));
  render(<ProfileEditor profile={readStoredProfile()} guest={false} onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Rede social 1"), {
    target: { value: "javascript:alert(1)" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(readStoredProfile()).toEqual({ name: "Oli" });
});
it("trocar avatar preserva a ficha e lê perfis legados sem migração destrutiva", () => {
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({
      name: "Oli",
      bio: "Bio",
      pronouns: "ele/dela",
      socialLinks: ["https://github.com/oli"],
    }),
  );
  render(<ProfileIdentity guest={false} />);
  fireEvent.click(screen.getByText("Escolher avatar", { selector: "summary" }));
  fireEvent.click(screen.getByRole("button", { name: "Helena" }));
  expect(readStoredProfile()).toMatchObject({
    name: "Oli",
    photoUrl: "/profile-avatars/helena.webp",
    bio: "Bio",
    pronouns: "ele/dela",
    socialLinks: ["https://github.com/oli"],
  });
  localStorage.setItem("helena.profile.v1", "null");
  expect(readStoredProfile()).toEqual({});
});
