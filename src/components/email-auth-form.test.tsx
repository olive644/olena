import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { EmailAuthForm } from "./email-auth-form";
import type { AccountServices } from "../data/account-auth";

function setup(register = false, accepted = true, inline = false) {
  const user = { uid: "email-owner", email: "learner@example.test", displayName: "Learner" };
  const api = {
    validatePassword: vi.fn(async () => ({ isValid: true })),
    createUserWithEmailAndPassword: vi.fn(async () => ({ user })),
    signInWithEmailAndPassword: vi.fn(async () => ({ user })),
    sendPasswordResetEmail: vi.fn(async () => {}),
    sendEmailVerification: vi.fn(async () => {}),
    updateProfile: vi.fn(async () => {}),
  };
  const authState = { currentUser: user };
  const services = { auth: authState, authApi: api } as unknown as AccountServices;
  const complete = vi.fn();
  render(
    <EmailAuthForm
      services={services}
      accepted={accepted}
      initialRegister={register}
      inline={inline}
      onAuthenticated={complete}
      onBusy={vi.fn()}
    />,
  );
  if (!inline)
    fireEvent.click(screen.getByRole("button", { name: "Entrar ou criar conta com e-mail" }));
  const fill = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  return { api, complete, fill, services, user, authState };
}
it("creates an account, sends verification and never stores the password", async () => {
  const s = setup(true);
  s.fill("Seu nome", "Learner");
  s.fill("E-mail", "learner@example.test");
  s.fill("Senha", "A unique long passphrase 42!");
  s.fill("Confirmar senha", "A unique long passphrase 42!");
  fireEvent.submit(screen.getByRole("button", { name: "Criar conta com e-mail" }).closest("form")!);
  await waitFor(() => expect(s.complete).toHaveBeenCalledOnce());
  expect(s.api.sendEmailVerification).toHaveBeenCalledWith(s.user);
  expect(s.api.updateProfile).toHaveBeenCalledWith(s.user, { displayName: "Learner" });
  expect(JSON.stringify(localStorage)).not.toContain("A unique long passphrase 42!");
  expect((screen.getByLabelText("Senha", { exact: true }) as HTMLInputElement).value).toBe("");
});

it("does not complete against a different active account after the credential returns", async () => {
  const s = setup();
  s.fill("E-mail", "learner@example.test");
  s.fill("Senha", "a password");
  s.authState.currentUser = { ...s.user, uid: "different-owner" };
  fireEvent.submit(screen.getByRole("button", { name: "Entrar com e-mail" }).closest("form")!);
  await screen.findByText("Não foi possível entrar. Confira seus dados e tente novamente.");
  expect(s.complete).not.toHaveBeenCalled();
});
it("registers inline with Firebase policy and leaves the display name to onboarding", async () => {
  const s = setup(true, true, true);
  s.fill("E-mail", "learner@example.test");
  s.fill("Senha", "abcdefgh");
  expect(screen.queryByRole("meter")).toBeNull();
  fireEvent.submit(screen.getByRole("button", { name: "Criar conta com e-mail" }).closest("form")!);
  await waitFor(() => expect(s.complete).toHaveBeenCalledOnce());
  expect(s.api.validatePassword).toHaveBeenCalledWith(s.services.auth, "abcdefgh");
  expect(s.api.createUserWithEmailAndPassword).toHaveBeenCalledWith(
    s.services.auth,
    "learner@example.test",
    "abcdefgh",
  );
  expect(s.api.sendEmailVerification).toHaveBeenCalledWith(s.user);
  expect(s.api.updateProfile).not.toHaveBeenCalled();
});
it("signs in to the existing account without creating another account", async () => {
  const s = setup(false, true, true);
  s.fill("E-mail", "learner@example.test");
  fireEvent.change(screen.getByPlaceholderText("Coloque sua senha"), {
    target: { value: "abcdef" },
  });
  fireEvent.submit(screen.getByRole("button", { name: "Entrar com e-mail" }).closest("form")!);
  await waitFor(() => expect(s.complete).toHaveBeenCalledOnce());
  expect(s.api.signInWithEmailAndPassword).toHaveBeenCalledOnce();
  expect(s.api.createUserWithEmailAndPassword).not.toHaveBeenCalled();
});
it("rejects mismatched passwords before any request", async () => {
  const s = setup(true);
  s.fill("Senha", "A unique long passphrase 42!");
  s.fill("Confirmar senha", "different");
  fireEvent.submit(screen.getByRole("button", { name: "Criar conta com e-mail" }).closest("form")!);
  expect(screen.getByText("As senhas precisam ser iguais.")).toBeTruthy();
  expect(s.api.createUserWithEmailAndPassword).not.toHaveBeenCalled();
});
it("does not submit login without consent", () => {
  const s = setup(false, false);
  expect(
    screen
      .getByRole("button", { name: "Entrar ou criar conta com e-mail" })
      .hasAttribute("disabled"),
  ).toBe(true);
  expect(s.api.signInWithEmailAndPassword).not.toHaveBeenCalled();
});
it("password recovery does not disclose whether an account exists", async () => {
  const s = setup();
  s.fill("E-mail", "learner@example.test");
  s.api.sendPasswordResetEmail.mockRejectedValueOnce({ code: "auth/user-not-found" });
  fireEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));
  fireEvent.submit(screen.getByRole("button", { name: "Enviar recuperação" }).closest("form")!);
  await waitFor(() =>
    expect(
      screen.getByText(
        "Se houver uma conta para este e-mail, você receberá instruções para redefinir a senha.",
      ),
    ).toBeTruthy(),
  );
  expect(s.complete).not.toHaveBeenCalled();
});

it("blocks registration below eight characters", () => {
  const s = setup(true, true, true);
  s.fill("E-mail", "learner@example.test");
  s.fill("Senha", "abcdefg");
  const button = screen.getByRole("button", { name: "Criar conta com e-mail" });
  expect(button.hasAttribute("disabled")).toBe(true);
  fireEvent.submit(button.closest("form")!);
  expect(s.api.createUserWithEmailAndPassword).not.toHaveBeenCalled();
});

it("shows invalid email through the paper notification", () => {
  const s = setup(true, true, true);
  s.fill("E-mail", "invalid");
  s.fill("Senha", "abcdefgh");
  fireEvent.submit(screen.getByRole("button", { name: "Criar conta com e-mail" }).closest("form")!);
  expect(screen.getByRole("status").className).toContain("account-access__notice");
  expect(s.api.createUserWithEmailAndPassword).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
  expect(screen.queryByRole("status")).toBeNull();
});
