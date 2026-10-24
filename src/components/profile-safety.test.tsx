import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProfileSafety } from "./profile-safety";
const mocks = vi.hoisted(() => ({ social: vi.fn(), support: vi.fn() }));
vi.mock("../data/profile-social", () => ({ requestSocial: mocks.social }));
vi.mock("../data/support", () => ({ requestSupport: mocks.support }));
const person = {
  username: "bob",
  name: "Bob",
  photoUrl: "/profile-avatars/helena.webp",
  followers: 1,
  following: 1,
  followed: true,
  followsYou: true,
  shared: true,
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("só bloqueia após confirmar e propaga a resposta do servidor", async () => {
  const onChange = vi.fn();
  mocks.social.mockResolvedValue({ profile: { ...person, blocked: true } });
  render(<ProfileSafety person={person} onChange={onChange} />);
  fireEvent.click(screen.getByText("Segurança do perfil"));
  const block = screen.getByRole("button", { name: "Bloquear usuário" });
  expect(block.textContent).toBe("");
  fireEvent.click(block);
  expect(mocks.social).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Confirmar"));
  await waitFor(() => expect(onChange).toHaveBeenCalled());
  expect(mocks.social).toHaveBeenCalledWith({ action: "block", username: "bob" });
});
it("envia denúncia ao atendimento e não anuncia sucesso em falha", async () => {
  mocks.support.mockRejectedValueOnce(new Error("Sem conexão"));
  render(<ProfileSafety person={person} onChange={vi.fn()} />);
  fireEvent.click(screen.getByText("Segurança do perfil"));
  const report = screen.getByRole("button", { name: "Denunciar usuário" });
  expect(report.textContent).toBe("");
  fireEvent.click(report);
  fireEvent.change(screen.getByLabelText("O que aconteceu?"), {
    target: { value: "Perfil enviou mensagens ofensivas." },
  });
  fireEvent.click(screen.getByText("Confirmar"));
  await screen.findByText("Sem conexão");
  expect(mocks.support).toHaveBeenCalledWith(
    expect.objectContaining({ text: expect.stringContaining("@bob") }),
  );
  expect(screen.queryByText(/Denúncia enviada/)).toBeNull();
});
