import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { writeSyncedStorage } from "../data/synced-storage";
import { useCloudSync } from "./use-cloud-sync";

vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("VITEST", "");
  vi.stubEnv("VITE_FIREBASE_API_KEY", "key");
  vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "auth.example");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "project");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("mantém alteração pendente após falha e permite tentar a sincronização novamente", async () => {
  const user = {
    uid: "user-1",
    displayName: "Helena",
    email: "helena@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  const signOut = vi.fn(async () => undefined);
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
      signOut,
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);

  let writeCount = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET") return new Response("null", { status: 200 });
      writeCount += 1;
      if (writeCount === 2) return new Response("failure", { status: 503 });
      return new Response("null", { status: 200 });
    }),
  );

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));

  act(() => writeSyncedStorage("helena.soloProgress", "3"));
  await waitFor(() => expect(result.current.status).toBe("offline"));
  expect(writeCount).toBe(2);

  act(() => result.current.syncNow?.());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  expect(writeCount).toBe(3);

  await act(async () => result.current.signOut?.());
  expect(signOut).toHaveBeenCalledOnce();
  expect(localStorage.getItem("helena.soloProgress")).toBeNull();
});

it("não deixa um GET antigo sobrescrever uma escrita local feita durante a busca na nuvem", async () => {
  // Reproduz o login com Google: assim que a pessoa autentica,
  // onAuthStateChanged dispara e o hook busca o estado na nuvem (GET) ao
  // mesmo tempo em que GoogleLogin acabou de gravar localmente que o
  // onboarding foi concluido. Se o GET (rede, mais lento) responder DEPOIS
  // dessa gravacao com um instantaneo antigo da nuvem, ele nao pode apagar
  // a marca de conclusao que acabou de ser salva.
  const user = {
    uid: "user-1",
    displayName: "Helena",
    email: "helena@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
      signOut: vi.fn(),
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);

  let resolveGet: (value: Response) => void = () => undefined;
  const puts: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET") {
        return new Promise<Response>((resolve) => {
          resolveGet = resolve;
        });
      }
      puts.push(init?.body as string);
      return new Response("null", { status: 200 });
    }),
  );

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("loading"));

  // A gravacao local (equivalente a GoogleLogin concluindo o onboarding)
  // acontece ENQUANTO o GET ainda esta pendente.
  act(() => writeSyncedStorage("helena.onboarding.v1", JSON.stringify({ completed: true })));

  // A nuvem responde com um instantaneo antigo, sem o onboarding concluido.
  act(() =>
    resolveGet(
      new Response(
        JSON.stringify({ items: { "helena.onboarding.v1": JSON.stringify({ completed: false }) } }),
        { status: 200 },
      ),
    ),
  );

  await waitFor(() => expect(result.current.status).toBe("synced"));

  expect(JSON.parse(localStorage.getItem("helena.onboarding.v1") ?? "{}")).toEqual({
    completed: true,
  });
  expect(puts).toHaveLength(1);
  expect(JSON.parse(puts[0]!).items["helena.onboarding.v1"]).toBe(
    JSON.stringify({ completed: true }),
  );
});

it("prioriza o estado da conta sobre um backup local antigo e preserva só a mudança nova", async () => {
  const user = {
    uid: "user-2",
    displayName: "Conta Real",
    email: "conta@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
      signOut: vi.fn(),
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);
  localStorage.setItem("helena.profile.v1", "avatar-antigo");
  let resolveGet: (value: Response) => void = () => undefined;
  const puts: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET")
        return new Promise<Response>((resolve) => {
          resolveGet = resolve;
        });
      puts.push(init?.body as string);
      return new Response("null", { status: 200 });
    }),
  );
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("loading"));
  act(() => writeSyncedStorage("helena.onboarding.v1", "nova sessão"));
  act(() => writeSyncedStorage("helena.profile.v1", "avatar-padrão-gravado-pelo-login"));
  act(() =>
    resolveGet(
      new Response(
        JSON.stringify({
          items: {
            "helena.profile.v1": "avatar-da-nuvem",
            "helena.onboarding.v1": "sessão-antiga",
          },
        }),
        { status: 200 },
      ),
    ),
  );
  await waitFor(() => expect(result.current.status).toBe("synced"));
  expect(localStorage.getItem("helena.profile.v1")).toBe("avatar-da-nuvem");
  expect(localStorage.getItem("helena.onboarding.v1")).toBe("nova sessão");
  expect(JSON.parse(puts[0]!).items["helena.profile.v1"]).toBe("avatar-da-nuvem");
});

it("concilia alterações simultâneas por chave e preserva o conflito local", async () => {
  const user = {
    uid: "user-1",
    displayName: "Helena",
    email: "helena@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
      signOut: vi.fn(),
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);

  let getCount = 0;
  const puts: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET") {
        getCount += 1;
        return new Response(
          JSON.stringify(
            getCount === 1
              ? { items: { "helena.profile.v1": "base", "helenastudy.theme": "light" } }
              : { items: { "helena.profile.v1": "remote", "helenastudy.theme": "dark" } },
          ),
          { status: 200 },
        );
      }
      puts.push(init?.body as string);
      return new Response("null", { status: 200 });
    }),
  );

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));

  act(() => writeSyncedStorage("helena.profile.v1", "local"));
  await waitFor(() => expect(result.current.status).toBe("conflict"));

  expect(JSON.parse(puts.at(-1)!).items).toEqual({
    "helena.profile.v1": "local",
    "helenastudy.theme": "dark",
  });
  expect(localStorage.getItem("helenastudy.sync-conflict.v1")).toContain("helena.profile.v1");
});

function signedInServices(user: { uid: string; displayName: string; email: string }) {
  const account = { ...user, getIdToken: vi.fn(async () => "token") };
  const signOut = vi.fn(async () => undefined);
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: account },
    authApi: {
      onAuthStateChanged: (_auth: unknown, listener: (current: typeof account) => void) => {
        listener(account);
        return () => undefined;
      },
      signOut,
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);
  return signOut;
}

it("ao sair, apaga histórico, rascunhos e sessões deste aparelho e desconecta o Google Agenda", async () => {
  signedInServices({ uid: "ana", displayName: "Ana", email: "ana@example.com" });
  const fetchMock = vi.fn(async () => new Response("null", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const personal = [
    "helenastudy.workspace.history.v1",
    "helenastudy.handwriting.draft.abc",
    "helenastudy.handwriting.saved.page-1",
    "helena.profile.v1",
    "noteoli.pomodoro-streak.v1",
  ];
  for (const key of personal) localStorage.setItem(key, "dado da Ana");
  localStorage.setItem("outro-app.token", "x");
  sessionStorage.setItem("helena:local-room-session:v1", "{}");

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  await act(async () => {
    await result.current.signOut?.();
  });

  for (const key of personal) expect(localStorage.getItem(key)).toBeNull();
  expect(localStorage.getItem("helena.account.v1")).toBeNull();
  expect(sessionStorage.getItem("helena:local-room-session:v1")).toBeNull();
  expect(localStorage.getItem("outro-app.token")).toBe("x");
  expect(fetchMock).toHaveBeenCalledWith("/api/google-calendar?action=disconnect", {
    method: "POST",
  });
});

it("outra conta no mesmo aparelho não recebe os dados da anterior", async () => {
  signedInServices({ uid: "beto", displayName: "Beto", email: "beto@example.com" });
  const uploads: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") uploads.push(String(init.body));
      return new Response("null", { status: 200 });
    }),
  );
  localStorage.setItem("helena.account.v1", "ana");
  localStorage.setItem("helenastudy.workspace.v1", "espaco da Ana");
  localStorage.setItem("helenastudy.workspace.history.v1", "historico da Ana");
  localStorage.setItem("helena.onboarding.v1", '{"completed":true}');

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));

  expect(localStorage.getItem("helenastudy.workspace.v1")).toBeNull();
  expect(localStorage.getItem("helenastudy.workspace.history.v1")).toBeNull();
  expect(localStorage.getItem("helena.account.v1")).toBe("beto");
  expect(uploads.join("")).not.toContain("Ana");
  expect(localStorage.getItem("helena.onboarding.v1")).toBe('{"completed":true}');
});

it("a mesma conta voltando ao aparelho mantém o que já estava nele", async () => {
  signedInServices({ uid: "ana", displayName: "Ana", email: "ana@example.com" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("null", { status: 200 })),
  );
  localStorage.setItem("helena.account.v1", "ana");
  localStorage.setItem("helenastudy.workspace.history.v1", "historico da Ana");

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));

  expect(localStorage.getItem("helenastudy.workspace.history.v1")).toBe("historico da Ana");
});

function deletionSetup(overrides: { reauthenticateWithPopup?: () => Promise<unknown> } = {}) {
  const user = {
    uid: "user-1",
    displayName: "Helena",
    email: "helena@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  const calls: string[] = [];
  const authApi = {
    onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
      listener(user);
      return () => undefined;
    },
    signOut: vi.fn(async () => undefined),
    GoogleAuthProvider: class {},
    reauthenticateWithPopup: vi.fn(
      overrides.reauthenticateWithPopup ?? (async () => void calls.push("reauth")),
    ),
    deleteUser: vi.fn(async () => void calls.push("user")),
  };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi,
    databaseURL: "https://project.firebaseio.com",
  } as never);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "DELETE") calls.push(`delete ${String(input).split("?")[0]}`);
    return new Response("null", { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, authApi };
}

it("exclui a conta: confirma o login, apaga a nuvem e a conta e limpa o aparelho", async () => {
  const { calls, authApi } = deletionSetup();
  localStorage.setItem("helena.soloProgress", "9");
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.deleteAccount).toBeTypeOf("function"));
  await waitFor(() => expect(result.current.status).toBe("synced"));

  await act(async () => {
    await result.current.deleteAccount?.();
  });

  expect(calls).toEqual([
    "reauth",
    "delete https://project.firebaseio.com/users/user-1.json",
    "user",
  ]);
  expect(authApi.reauthenticateWithPopup).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem("helena.soloProgress")).toBeNull();
});

it("se o login for fechado, nada é apagado e os dados continuam no aparelho", async () => {
  const { calls } = deletionSetup({
    reauthenticateWithPopup: async () => {
      throw Object.assign(new Error("fechou"), { code: "auth/popup-closed-by-user" });
    },
  });
  localStorage.setItem("helena.soloProgress", "9");
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));

  await act(async () => {
    await expect(result.current.deleteAccount?.()).rejects.toMatchObject({ reason: "cancelled" });
  });

  expect(calls).toEqual([]);
  expect(localStorage.getItem("helena.soloProgress")).toBe("9");
});
