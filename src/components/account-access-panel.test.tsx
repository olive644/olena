import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AccountAccessPanel } from "./account-access-panel";
import { getFirebaseAccountServices } from "../data/firebase-account";
vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

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

it("requires separate consent before linking Google to the current UID", async () => {
  const user = {
    uid: "same-owner",
    email: "owner@example.test",
    emailVerified: true,
    providerData: [{ providerId: "password" }],
    getIdToken: vi.fn(async () => "token"),
  };
  class Provider {
    readonly providerId = "google.com";
  }
  const linkWithPopup = vi.fn(async () => ({ user }));
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: { linkWithPopup, GoogleAuthProvider: Provider, reload: vi.fn(async () => {}) },
  } as never);
  render(<AccountAccessPanel />);
  const google = await screen.findByRole("button", { name: "Associar Google" });
  expect(screen.queryByRole("button", { name: "Associar Apple" })).toBeNull();
  expect(google.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: /Autorizo associar/ }));
  fireEvent.click(google);
  await screen.findByText("Método associado à sua conta.");
  expect(linkWithPopup).toHaveBeenCalledWith(
    user,
    expect.objectContaining({ providerId: "google.com" }),
  );
  expect(user.uid).toBe("same-owner");
});

function accountSetup(hasPassword = true, linkedDiscord = false) {
  const user = {
    uid: "settings-owner",
    email: "owner@example.test",
    emailVerified: true,
    providerData: hasPassword
      ? [{ providerId: "password", displayName: "", email: "owner@example.test" }]
      : [{ providerId: "google.com", displayName: "Google Learner", email: "owner@example.test" }],
    getIdToken: vi.fn(async () => "owned-token"),
  };
  const sendPasswordResetEmail = vi.fn(async () => {});
  const linkWithCredential = vi.fn(async () => {
    user.providerData.push({ providerId: "password", displayName: "", email: user.email });
    return { user };
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        discord: { linked: linkedDiscord, ...(linkedDiscord ? { name: "discordlearner" } : {}) },
      }),
    ),
  );
  const services = {
    auth: { currentUser: user },
    authApi: {
      reload: vi.fn(async () => {}),
      sendPasswordResetEmail,
      linkWithCredential,
      validatePassword: vi.fn(async () => ({ isValid: true })),
      EmailAuthProvider: { credential: vi.fn(() => ({ providerId: "password" })) },
    },
  };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue(services as never);
  return { user, services, sendPasswordResetEmail, linkWithCredential };
}

it("remembers explicit linking consent after remount for that UID only", async () => {
  const s = accountSetup();
  const view = render(<AccountAccessPanel />);
  fireEvent.click(await screen.findByRole("checkbox", { name: /Autorizo associar/ }));
  view.unmount();
  const again = render(<AccountAccessPanel />);
  const checkbox = await screen.findByRole("checkbox", { name: /Autorizo associar/ });
  expect((checkbox as HTMLInputElement).checked).toBe(true);
  again.unmount();
  s.user.uid = "other-owner";
  render(<AccountAccessPanel />);
  expect(
    ((await screen.findByRole("checkbox", { name: /Autorizo associar/ })) as HTMLInputElement)
      .checked,
  ).toBe(false);
});

it("masks an existing password and updates the panel immediately after linking a new one", async () => {
  const s = accountSetup(false);
  render(<AccountAccessPanel />);
  fireEvent.click(await screen.findByRole("checkbox", { name: /Autorizo associar/ }));
  const value = "Maré! Livro 42 Jardim";
  fireEvent.change(screen.getByLabelText("Senha", { exact: true }), { target: { value } });
  fireEvent.change(screen.getByLabelText("Confirmar senha", { exact: true }), {
    target: { value },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Adicionar senha à minha conta" }).closest("form")!,
  );
  expect((await screen.findByLabelText("Senha cadastrada")).textContent).toBe("********");
  expect(screen.queryByRole("button", { name: "Adicionar senha à minha conta" })).toBeNull();
  expect(s.linkWithCredential).toHaveBeenCalledOnce();
  expect(JSON.stringify(localStorage)).not.toContain(value);
});

it("shows the owned Google and Discord names with linked states", async () => {
  accountSetup(false, true);
  render(<AccountAccessPanel />);
  expect(
    (await screen.findByRole("button", { name: "Google associado" })).getAttribute("data-linked"),
  ).toBe("true");
  expect(await screen.findByText("Google Learner")).toBeTruthy();
  expect(await screen.findByText("@discordlearner")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Discord associado" }).getAttribute("data-linked"),
  ).toBe("true");
});

it("requests a reset once, announces spam advice and keeps the cooldown across remount", async () => {
  let now = 1900000000000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const s = accountSetup();
  const view = render(<AccountAccessPanel />);
  const reset = await screen.findByRole("button", { name: "Redefinir minha senha por e-mail" });
  fireEvent.click(reset);
  fireEvent.click(reset);
  await screen.findByText("Confira seu e-mail");
  expect(screen.getByText(/Solicitação de recuperação enviada/).textContent).toContain(
    "Spam ou Lixo eletrônico",
  );
  expect(s.sendPasswordResetEmail).toHaveBeenCalledExactlyOnceWith(s.services.auth, s.user.email);
  view.unmount();
  const again = render(<AccountAccessPanel />);
  expect(
    (await screen.findByRole("button", { name: "Redefinir minha senha por e-mail" })).hasAttribute(
      "disabled",
    ),
  ).toBe(true);
  again.unmount();
  now += 61000;
  render(<AccountAccessPanel />);
  const ready = await screen.findByRole("button", { name: "Redefinir minha senha por e-mail" });
  expect(ready.hasAttribute("disabled")).toBe(false);
  fireEvent.click(ready);
  await waitFor(() => expect(s.sendPasswordResetEmail).toHaveBeenCalledTimes(2));
});

it("does not announce email delivery when Firebase rejects the reset", async () => {
  const s = accountSetup();
  s.sendPasswordResetEmail.mockRejectedValueOnce({ code: "auth/network-request-failed" });
  render(<AccountAccessPanel />);
  fireEvent.click(await screen.findByRole("button", { name: "Redefinir minha senha por e-mail" }));
  await screen.findByText("Sem conexão. Confira sua internet e tente novamente.");
  expect(screen.queryByText("Confira seu e-mail")).toBeNull();
});

it("does not mark an unknown Discord connection as unlinked and allows checking again", async () => {
  accountSetup();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ discord: { linked: false } })),
  );
  render(<AccountAccessPanel />);
  const retry = await screen.findByRole("button", { name: "Tentar novamente" });
  expect(retry.getAttribute("data-linked")).toBe("unknown");
  fireEvent.click(retry);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Associar Discord" }).getAttribute("data-linked"),
    ).toBe("false"),
  );
});

it("does not show a previous account's reset notice after the active UID changes", async () => {
  const s = accountSetup();
  let complete: () => void = () => {};
  s.sendPasswordResetEmail.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  render(<AccountAccessPanel />);
  fireEvent.click(await screen.findByRole("button", { name: "Redefinir minha senha por e-mail" }));
  await waitFor(() => expect(s.sendPasswordResetEmail).toHaveBeenCalledOnce());
  await act(async () => {
    s.services.auth.currentUser = { ...s.user, uid: "another-owner" };
    complete();
  });
  expect(screen.queryByText("Confira seu e-mail")).toBeNull();
  expect(localStorage.getItem("helena.accountAccess.v1")).toBeNull();
});
