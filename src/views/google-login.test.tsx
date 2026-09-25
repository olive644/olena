import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFirebaseAccountServices } from "../data/firebase-account";
import {
  PRIVACY_CONSENT_ITEM,
  PRIVACY_POLICY_PATH,
  PRIVACY_POLICY_VERSION,
} from "../domain/privacy-policy";
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
      },
      databaseURL: "https://project.firebaseio.com",
      redirectResult: null,
    } as never);

    const finish = vi.fn();
    render(<GoogleLogin answers={["Inglês"]} onFinish={finish} />);
    await waitFor(() => expect(getFirebaseAccountServices).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole("checkbox", { name: /Li e concordo/ }));
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
    const profile = JSON.stringify({ name: "Ana", photoUrl: "/profile-avatars/anonha.webp" });
    localStorage.setItem("helena.profile.v1", profile);
    sessionStorage.setItem("helena.pending-google-answers", JSON.stringify(["Matemática"]));
    vi.mocked(getFirebaseAccountServices).mockResolvedValue({
      auth: {},
      authApi: {
        GoogleAuthProvider: FakeGoogleAuthProvider,
        signInWithPopup: vi.fn(),
        signInWithRedirect: vi.fn(),
      },
      databaseURL: "https://project.firebaseio.com",
      redirectResult: { user: { displayName: "Ana" } },
    } as never);

    const finish = vi.fn();
    render(<GoogleLogin answers={[]} onFinish={finish} />);

    await waitFor(() => expect(finish).toHaveBeenCalledOnce());
    expect(sessionStorage.getItem("helena.pending-google-answers")).toBeNull();
    expect(localStorage.getItem("helena.profile.v1")).toBe(profile);
    expect(JSON.parse(localStorage.getItem("helena.onboarding.v1") ?? "{}")).toEqual({
      answers: ["Matemática"],
      completed: true,
    });
  });

  it("volta ao botão de login quando nao ha resultado de redirecionamento pendente", async () => {
    sessionStorage.setItem("helena.pending-google-answers", JSON.stringify(["Matemática"]));
    vi.mocked(getFirebaseAccountServices).mockResolvedValue({
      auth: {},
      authApi: {
        GoogleAuthProvider: FakeGoogleAuthProvider,
        signInWithPopup: vi.fn(),
        signInWithRedirect: vi.fn(),
      },
      databaseURL: "https://project.firebaseio.com",
      redirectResult: null,
    } as never);

    const finish = vi.fn();
    render(<GoogleLogin answers={[]} onFinish={finish} />);

    await waitFor(() => expect(getFirebaseAccountServices).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole("checkbox", { name: /Li e concordo/ }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Entrar com Google" }).hasAttribute("disabled"),
      ).toBe(false),
    );
    expect(finish).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("helena.pending-google-answers")).toBeNull();
  });
});

describe("concordância com a Política de Privacidade", () => {
  function fakeServices(signInWithPopup = vi.fn().mockResolvedValue(undefined)) {
    vi.mocked(getFirebaseAccountServices).mockResolvedValue({
      auth: {},
      authApi: {
        GoogleAuthProvider: FakeGoogleAuthProvider,
        signInWithPopup,
        signInWithRedirect: vi.fn(),
      },
      databaseURL: "https://project.firebaseio.com",
      redirectResult: null,
    } as never);
    return signInWithPopup;
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("começa desmarcada e mantém o botão desabilitado com uma explicação", async () => {
    fakeServices();
    render(<GoogleLogin answers={[]} onFinish={vi.fn()} />);
    const box = await screen.findByRole("checkbox", { name: /Li e concordo/ });
    expect((box as HTMLInputElement).checked).toBe(false);
    const button = screen.getByRole("button", { name: "Entrar com Google" });
    await waitFor(() => expect(getFirebaseAccountServices).toHaveBeenCalled());
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Marque a concordância para poder entrar.")).toBeTruthy();
    expect(button.getAttribute("aria-describedby")).toBe("login-consent-help");
  });

  it("libera o botão só depois de marcar, e desabilita de novo ao desmarcar", async () => {
    fakeServices();
    render(<GoogleLogin answers={[]} onFinish={vi.fn()} />);
    const box = await screen.findByRole("checkbox", { name: /Li e concordo/ });
    const button = screen.getByRole("button", { name: "Entrar com Google" });
    fireEvent.click(box);
    await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
    fireEvent.click(box);
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("abre a política em outra aba, sem perder as respostas do onboarding", async () => {
    fakeServices();
    render(<GoogleLogin answers={["Inglês"]} onFinish={vi.fn()} />);
    const link = await screen.findByRole("link", { name: /Política de Privacidade/ });
    expect(link.getAttribute("href")).toBe(PRIVACY_POLICY_PATH);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.textContent).toContain("abre em uma nova aba");
  });

  it("registra a versão aceita e o momento ao entrar", async () => {
    const popup = fakeServices();
    const finish = vi.fn();
    render(<GoogleLogin answers={[]} onFinish={finish} />);
    fireEvent.click(await screen.findByRole("checkbox", { name: /Li e concordo/ }));
    const button = screen.getByRole("button", { name: "Entrar com Google" });
    await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
    fireEvent.click(button);
    await waitFor(() => expect(finish).toHaveBeenCalledOnce());
    expect(popup).toHaveBeenCalledOnce();
    const stored = JSON.parse(localStorage.getItem(PRIVACY_CONSENT_ITEM) ?? "null") as {
      version: string;
      acceptedAt: string;
    };
    expect(stored.version).toBe(PRIVACY_POLICY_VERSION);
    expect(Number.isNaN(Date.parse(stored.acceptedAt))).toBe(false);
  });

  it("não tenta entrar nem registra aceite sem a concordância", async () => {
    const popup = fakeServices();
    render(<GoogleLogin answers={[]} onFinish={vi.fn()} />);
    await screen.findByRole("checkbox", { name: /Li e concordo/ });
    await waitFor(() => expect(getFirebaseAccountServices).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Entrar com Google" }));
    expect(popup).not.toHaveBeenCalled();
    expect(localStorage.getItem(PRIVACY_CONSENT_ITEM)).toBeNull();
  });
});

describe("rodapé da Galeria.Oli no login", () => {
  it("aparece na tela de login, com o ícone à esquerda", async () => {
    vi.mocked(getFirebaseAccountServices).mockRejectedValue(new Error("setup"));
    const { container } = render(<GoogleLogin answers={[]} onFinish={vi.fn()} />);
    const footer = container.querySelector("footer.brand-footer");
    expect(footer?.textContent).toBe("Todos os direitos Galeria.Oli - OlenaStudy");
    expect(footer?.firstElementChild?.tagName).toBe("IMG");
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });
});
