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
it("masks a password after re-entry when Firebase providerData omits the password provider", async () => {
  accountSetup(false);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ password: true, google: true, discord: { linked: false } })),
  );
  render(<AccountAccessPanel />);
  expect((await screen.findByLabelText("Senha cadastrada")).textContent).toBe("********");
  expect(screen.queryByRole("button", { name: "Adicionar senha à minha conta" })).toBeNull();
});
it("opens confirmation and cancels without unlinking either provider", async () => {
  accountSetup(false, true);
  render(<AccountAccessPanel />);
  fireEvent.click(await screen.findByRole("button", { name: "Discord associado" }));
  expect(await screen.findByRole("dialog", { name: "Desvincular método de acesso?" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("unlink-"))).toBe(false);
});
it("reauthenticates the current account and refreshes the unlinked Google state after confirmation", async () => {
  const s = accountSetup(false, true);
  const reauthenticateWithPopup = vi.fn(async () => ({ user: s.user }));
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    ...s.services,
    authApi: { ...s.services.authApi, reauthenticateWithPopup, GoogleAuthProvider: class {} },
  } as never);
  let unlinked = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      if (String(url).includes("unlink-google")) {
        unlinked = true;
        return Response.json({});
      }
      return Response.json({
        password: true,
        google: !unlinked,
        discord: { linked: true, name: "learner" },
      });
    }),
  );
  render(<AccountAccessPanel />);
  await screen.findByText("@learner");
  fireEvent.click(screen.getByRole("button", { name: "Google associado" }));
  fireEvent.click(await screen.findByRole("button", { name: "Desvincular" }));
  await screen.findByText("Método desvinculado. Seus estudos foram preservados.");
  await screen.findByRole("button", { name: "Associar Google" });
  expect(reauthenticateWithPopup).toHaveBeenCalledOnce();
  expect(s.user.uid).toBe("settings-owner");
});
it("keeps the confirmation open and shows the last-method safeguard without announcing success", async () => {
  const s = accountSetup(false, true);
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    ...s.services,
    authApi: {
      ...s.services.authApi,
      reauthenticateWithPopup: vi.fn(async () => ({ user: s.user })),
      GoogleAuthProvider: class {},
    },
  } as never);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      String(url).includes("unlink-discord")
        ? Response.json({ error: "last-method" }, { status: 409 })
        : Response.json({ password: false, google: true, discord: { linked: true } }),
    ),
  );
  render(<AccountAccessPanel />);
  fireEvent.click(await screen.findByRole("button", { name: "Discord associado" }));
  fireEvent.click(await screen.findByRole("button", { name: "Desvincular" }));
  await screen.findAllByText("Adicione outro método de acesso antes de desvincular este.");
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.queryByText("Método desvinculado. Seus estudos foram preservados.")).toBeNull();
});

function reauthSetup(authTime: string) {
  const s = accountSetup(false, false);
  const reauthenticateWithPopup = vi.fn(async () => ({ user: s.user }));
  Object.assign(s.user, {
    getIdTokenResult: vi.fn(async () => ({ authTime, token: "owned-token" })),
    getIdToken: vi.fn(async () => "fresh-token"),
  });
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    ...s.services,
    authApi: { ...s.services.authApi, reauthenticateWithPopup, GoogleAuthProvider: class {} },
  } as never);
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      const text = String(url);
      calls.push(
        `${text} ${(init?.headers as Record<string, string> | undefined)?.["Authorization"] ?? ""}`,
      );
      if (text.includes("step=start"))
        return Response.json({ url: "https://example.test/blocked" });
      if (text.includes("revoke-sessions")) return Response.json({});
      return Response.json({ password: false, google: true, discord: { linked: false } });
    }),
  );
  return { ...s, reauthenticateWithPopup, calls };
}
const startCalls = (calls: string[]) => calls.filter((call) => call.includes("step=start"));

it("asks the person to confirm their access before linking Discord with an old login", async () => {
  const s = reauthSetup(new Date(Date.now() - 3600_000).toUTCString());
  render(<AccountAccessPanel />);
  fireEvent.click(await screen.findByRole("checkbox", { name: /Autorizo associar/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Associar Discord" }));
  expect(await screen.findByRole("dialog", { name: "Confirme que é você" })).toBeTruthy();
  expect(startCalls(s.calls)).toHaveLength(0);
  expect(s.reauthenticateWithPopup).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  await waitFor(() => expect(startCalls(s.calls)).toHaveLength(1));
  expect(s.reauthenticateWithPopup).toHaveBeenCalledOnce();
  expect(startCalls(s.calls)[0]).toContain("Bearer fresh-token");
});

it("links Discord straight away after a recent login, without a second prompt", async () => {
  const s = reauthSetup(new Date(Date.now() - 20_000).toUTCString());
  render(<AccountAccessPanel />);
  fireEvent.click(await screen.findByRole("checkbox", { name: /Autorizo associar/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Associar Discord" }));
  await waitFor(() => expect(startCalls(s.calls)).toHaveLength(1));
  expect(screen.queryByRole("dialog", { name: "Confirme que é você" })).toBeNull();
  expect(s.reauthenticateWithPopup).not.toHaveBeenCalled();
});

it("opens the confirmation when the server says the login is too old", async () => {
  const s = reauthSetup(new Date(Date.now() - 20_000).toUTCString());
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      String(url).includes("step=start")
        ? Response.json({ error: "recent-login" }, { status: 401 })
        : Response.json({ password: false, google: true, discord: { linked: false } }),
    ),
  );
  render(<AccountAccessPanel />);
  fireEvent.click(await screen.findByRole("checkbox", { name: /Autorizo associar/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Associar Discord" }));
  expect(await screen.findByRole("dialog", { name: "Confirme que é você" })).toBeTruthy();
  expect(s.reauthenticateWithPopup).not.toHaveBeenCalled();
});

it("signs out of every device only after confirming access, then leaves this device", async () => {
  const s = reauthSetup(new Date(Date.now() - 3600_000).toUTCString());
  const onSignOut = vi.fn(async () => {});
  render(<AccountAccessPanel onSignOut={onSignOut} />);
  fireEvent.click(await screen.findByRole("button", { name: "Sair de todos os aparelhos" }));
  expect(await screen.findByRole("dialog", { name: "Confirme que é você" })).toBeTruthy();
  expect(onSignOut).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  await waitFor(() => expect(onSignOut).toHaveBeenCalledOnce());
  expect(s.reauthenticateWithPopup).toHaveBeenCalledOnce();
  expect(
    s.calls.some((call) => call.includes("revoke-sessions") && call.includes("fresh-token")),
  ).toBe(true);
});

it("keeps this device signed in when the server refuses to end the sessions", async () => {
  reauthSetup(new Date(Date.now() - 3600_000).toUTCString());
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      String(url).includes("revoke-sessions")
        ? new Response("{}", { status: 429 })
        : Response.json({ password: false, google: true, discord: { linked: false } }),
    ),
  );
  const onSignOut = vi.fn(async () => {});
  render(<AccountAccessPanel onSignOut={onSignOut} />);
  fireEvent.click(await screen.findByRole("button", { name: "Sair de todos os aparelhos" }));
  fireEvent.click(await screen.findByRole("button", { name: "Continuar" }));
  await screen.findAllByText(
    "Não foi possível encerrar as sessões agora. Tente novamente em instantes.",
  );
  expect(onSignOut).not.toHaveBeenCalled();
});
