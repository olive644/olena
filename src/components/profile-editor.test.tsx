import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProfileEditor } from "./profile-editor";
import { readStoredProfile } from "../hooks/use-stored-profile";
import { ProfileIdentity } from "./profile-preferences";
import { requestProfileHandle } from "../data/profile-handle";
vi.mock("../data/profile-handle", () => ({
  PROFILE_HANDLE_CHANGED: "olena:profile-handle-changed",
  requestProfileHandle: vi.fn(async (_method: string, username: string) => ({
    username,
    creks: false,
  })),
}));

it("salva campos juntos, normaliza nome e rede, preserva foto e dados existentes", async () => {
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Oli", photoUrl: "/original.webp" }),
  );
  const close = vi.fn();
  render(<ProfileEditor profile={readStoredProfile()} guest={false} onClose={close} />);
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Oliver" } });
  fireEvent.change(screen.getByLabelText("Nome de usuário"), { target: { value: "OLI_ESTUDA" } });
  expect((screen.getByLabelText("Nome de usuário") as HTMLInputElement).value).toBe("oli_estuda");
  fireEvent.change(screen.getByLabelText("Bio"), { target: { value: "Estudando matemática" } });
  fireEvent.change(screen.getByLabelText("Rede social 1"), { target: { value: "github.com/oli" } });
  expect(screen.getByText("GitHub")).toBeTruthy();
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Oli", photoUrl: "/new.webp" }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(readStoredProfile()).toMatchObject({
    name: "Oliver",
    username: "oli_estuda",
    bio: "Estudando matemática",
    photoUrl: "/new.webp",
    socialLinks: ["https://github.com/oli"],
  });
  expect(close).toHaveBeenCalledOnce();
});
it("cancelar não altera o perfil e erro de armazenamento mantém o rascunho", async () => {
  const saved = JSON.stringify({ name: "Oli" });
  localStorage.setItem("helena.profile.v1", saved);
  const close = vi.fn();
  render(<ProfileEditor profile={readStoredProfile()} guest={false} onClose={close} />);
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Outro" } });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Quota");
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/continuam aqui/));
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
it("conflito no servidor preserva o perfil e deixa o rascunho disponível", async () => {
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Oli", username: "antigo" }));
  vi.mocked(requestProfileHandle).mockRejectedValueOnce(new Error("Esse @ já está em uso."));
  const close = vi.fn();
  render(<ProfileEditor profile={readStoredProfile()} guest={false} onClose={close} />);
  fireEvent.change(screen.getByLabelText("Nome de usuário"), { target: { value: "ocupado" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("já está em uso"));
  expect(readStoredProfile().username).toBe("antigo");
  expect((screen.getByLabelText("Nome de usuário") as HTMLInputElement).value).toBe("ocupado");
  expect(close).not.toHaveBeenCalled();
});
it("guest não pode criar @ nem aproveita nome legado", async () => {
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Guest", username: "legado" }));
  const close = vi.fn();
  const before = vi.mocked(requestProfileHandle).mock.calls.length;
  render(<ProfileEditor profile={readStoredProfile()} guest onClose={close} />);
  expect((screen.getByLabelText("Nome de usuário") as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
  await waitFor(() => expect(close).toHaveBeenCalled());
  expect(readStoredProfile().username).toBe("");
  expect(vi.mocked(requestProfileHandle).mock.calls.length).toBe(before);
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
