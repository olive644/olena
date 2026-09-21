import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { GoogleLogin } from "./google-login";

vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: vi.fn() }));

it("does not complete login when Firebase configuration is unavailable", async () => {
  vi.stubEnv("VITE_FIREBASE_API_KEY", "");
  vi.mocked(getFirebaseAccountServices).mockRejectedValue(new Error("setup"));
  const finish = vi.fn();
  const back = vi.fn();
  render(<GoogleLogin answers={[]} onFinish={finish} onBack={back} />);
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(screen.getByRole("button", { name: "Entrar com Google" }).hasAttribute("disabled")).toBe(
    true,
  );
  expect(finish).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
  expect(back).toHaveBeenCalledOnce();
  vi.unstubAllEnvs();
});

it("não oferece voltar ao onboarding para uma conta desconectada", async () => {
  vi.stubEnv("VITE_FIREBASE_API_KEY", "");
  vi.mocked(getFirebaseAccountServices).mockRejectedValue(new Error("setup"));
  render(<GoogleLogin answers={[]} onFinish={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
  vi.unstubAllEnvs();
});

class FakeGoogleAuthProvider {
  setCustomParameters() {
    /* not needed for these tests */
  }
}

describe("fallback de redirecionamento quando o pop-up é bloqueado", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("usa signInWithRedirect e guarda as respostas quando o pop-up é bloqueado", async () => {
    const signInWithPopup = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("blocked"), { code: "auth/popup-blocked" }));
    const signInWithRedirect = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getFirebaseAccountServices).mockResolvedValue({
      auth: {},
      authApi: {
        GoogleAuthProvider: FakeGoogleAuthProvider,
        signInWithPopup,
        signInWithRedirect,
        getRedirectResult: vi.fn().mockResolvedValue(null),
      },
      databaseURL: "https://project.firebaseio.com",
    } as never);

    const finish = vi.fn();
    render(<GoogleLogin answers={["Inglês"]} onFinish={finish} />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Entrar com Google" }).hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Entrar com Google" }));

    await waitFor(() => expect(signInWithRedirect).toHaveBeenCalledOnce());
    expect(finish).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("helena.pending-google-answers")).toBe(
      JSON.stringify(["Inglês"]),
    );
  });

  it("completa o login ao voltar do redirecionamento com o resultado pendente", async () => {
    sessionStorage.setItem("helena.pending-google-answers", JSON.stringify(["Matemática"]));
    const getRedirectResult = vi.fn().mockResolvedValue({
      user: { displayName: "Ana" },
    });
    vi.mocked(getFirebaseAccountServices).mockResolvedValue({
      auth: {},
      authApi: {
        GoogleAuthProvider: FakeGoogleAuthProvider,
        signInWithPopup: vi.fn(),
        signInWithRedirect: vi.fn(),
        getRedirectResult,
      },
      databaseURL: "https://project.firebaseio.com",
    } as never);

    const finish = vi.fn();
    render(<GoogleLogin answers={[]} onFinish={finish} />);

    await waitFor(() => expect(finish).toHaveBeenCalledOnce());
    expect(getRedirectResult).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem("helena.pending-google-answers")).toBeNull();
    expect(JSON.parse(localStorage.getItem("helena.onboarding.v1") ?? "{}")).toEqual({
      answers: ["Matemática"],
      completed: true,
    });
  });
});
