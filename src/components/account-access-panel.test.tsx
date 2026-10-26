import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AccountAccessPanel } from "./account-access-panel";
import { getFirebaseAccountServices } from "../data/firebase-account";
vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: vi.fn() }));

it("resends verification with a cooldown and checks the refreshed Firebase user", async () => {
  const user = {
    uid: "owner",
    email: "owner@example.test",
    emailVerified: false,
    providerData: [{ providerId: "password" }],
    getIdToken: vi.fn(async () => "token"),
  };
  const sendEmailVerification = vi.fn(async () => {});
  const reload = vi.fn(async () => {
    user.emailVerified = true;
  });
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: { sendEmailVerification, reload },
  } as never);
  render(<AccountAccessPanel verificationOnly />);
  const resend = await screen.findByRole("button", { name: "Reenviar verificação" });
  fireEvent.click(resend);
  await screen.findByText("E-mail de verificação enviado. Confira também a caixa de spam.");
  fireEvent.click(resend);
  await screen.findByText("Aguarde um minuto antes de reenviar.");
  expect(sendEmailVerification).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Já confirmei meu e-mail" }));
  await waitFor(() =>
    expect(screen.queryByRole("heading", { name: "Confirme seu e-mail" })).toBeNull(),
  );
  expect(reload).toHaveBeenCalledWith(user);
  expect(user.getIdToken).toHaveBeenCalledWith(true);
});

it("requires separate consent before linking Apple to the current UID", async () => {
  const user = {
    uid: "same-owner",
    email: "owner@example.test",
    emailVerified: true,
    providerData: [{ providerId: "password" }],
  };
  class Provider {
    constructor(readonly providerId: string) {}
  }
  const linkWithPopup = vi.fn(async () => ({ user }));
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: { linkWithPopup, OAuthProvider: Provider },
  } as never);
  render(<AccountAccessPanel />);
  const apple = await screen.findByRole("button", { name: "Associar Apple" });
  expect(apple.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: /Autorizo associar/ }));
  fireEvent.click(apple);
  await screen.findByText("Método associado à sua conta.");
  expect(linkWithPopup).toHaveBeenCalledWith(
    user,
    expect.objectContaining({ providerId: "apple.com" }),
  );
  expect(user.uid).toBe("same-owner");
});
