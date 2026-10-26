import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { EmailAuthForm } from "./email-auth-form";
import type { AccountServices } from "../data/account-auth";

function setup(register = false, accepted = true) {
  const user = { uid: "email-owner", email: "learner@example.test", displayName: "Learner" };
  const api = {
    validatePassword: vi.fn(async () => ({ isValid: true })),
    createUserWithEmailAndPassword: vi.fn(async () => ({ user })),
    signInWithEmailAndPassword: vi.fn(async () => ({ user })),
    sendPasswordResetEmail: vi.fn(async () => {}),
    sendEmailVerification: vi.fn(async () => {}),
    updateProfile: vi.fn(async () => {}),
  };
  const services = { auth: {}, authApi: api } as unknown as AccountServices;
  const complete = vi.fn();
  render(
    <EmailAuthForm
      services={services}
      accepted={accepted}
      initialRegister={register}
      onAuthenticated={complete}
      onBusy={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Entrar ou criar conta com e-mail" }));
  const fill = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  return { api, complete, fill, services, user };
}
it("creates an account, sends verification and never stores the password", async () => {
  const s = setup(true);
  s.fill("Seu nome", "Learner");
  s.fill("E-mail", "learner@example.test");
  s.fill("Senha", "A unique long password");
  s.fill("Confirmar senha", "A unique long password");
  fireEvent.submit(screen.getByRole("button", { name: "Criar conta com e-mail" }).closest("form")!);
  await waitFor(() => expect(s.complete).toHaveBeenCalledWith(s.user));
  expect(s.api.sendEmailVerification).toHaveBeenCalledWith(s.user);
  expect(s.api.updateProfile).toHaveBeenCalledWith(s.user, { displayName: "Learner" });
  expect(JSON.stringify(localStorage)).not.toContain("A unique long password");
  expect((screen.getByLabelText("Senha", { exact: true }) as HTMLInputElement).value).toBe("");
});
it("rejects mismatched passwords before any request", async () => {
  const s = setup(true);
  s.fill("Senha", "A unique long password");
  s.fill("Confirmar senha", "different");
  fireEvent.submit(screen.getByRole("button", { name: "Criar conta com e-mail" }).closest("form")!);
  expect(screen.getByText("As senhas precisam ser iguais.")).toBeTruthy();
  expect(s.api.createUserWithEmailAndPassword).not.toHaveBeenCalled();
});
it("does not submit login without consent", () => {
  const s = setup(false, false);
  fireEvent.submit(screen.getByRole("button", { name: "Entrar com e-mail" }).closest("form")!);
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
