import { act, configure, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { writeSyncedStorage } from "../data/synced-storage";
import { encodeCloudItems, decodeCloudItems } from "../data/cloud-state-codec";
import { createInitialWorkspace, type WorkspaceState } from "../domain/workspace";
import { useCloudSync } from "./use-cloud-sync";
import { ONBOARDING_OPTIONS, prepareOnboarding } from "../domain/onboarding-configuration";
import { recordRoomXp, readRoomXp, ROOM_XP_KEY } from "../data/room-xp";
import {
  finishMathPlace,
  mathPlaceRewards,
  MATH_PLACE_REWARDS_KEY,
} from "../data/math-place-rewards";

function notebook(id: string, title: string): WorkspaceState["notebooks"][number] {
  return { id, title, subjectId: "subject-english", createdAt: "2026", pageIds: [] };
}

vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: vi.fn() }));

// O envio à conta espera alguns segundos para juntar mudanças seguidas (CLOUD_UPLOAD_DELAY_MS).
configure({ asyncUtilTimeout: 9000 });
vi.setConfig({ testTimeout: 30000 });

// jsdom não implementa EventSource. Este fake guarda os listeners registrados para os testes
// poderem simular um evento "put" chegando do Firebase, como o navegador de verdade entregaria.
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  closed = false;
  private listeners = new Map<string, Set<(event: MessageEvent<string>) => void>>();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    (this.listeners.get(type) ?? this.listeners.set(type, new Set()).get(type)!).add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: unknown) {
    for (const listener of this.listeners.get(type) ?? [])
      listener({ data: JSON.stringify(data) } as MessageEvent<string>);
  }
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("VITEST", "");
  vi.stubEnv("VITE_FIREBASE_API_KEY", "key");
  vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "auth.example");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "project");
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("does not delete a newly saved calendar event when an older stream snapshot arrives", async () => {
  const remote = createInitialWorkspace();
  const key = "helenastudy.workspace.v1";
  const user = { uid: "calendar-user", getIdToken: vi.fn(async () => "token") };
  localStorage.setItem("helena.account.v1", user.uid);
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onIdTokenChanged: () => () => undefined,
      onAuthStateChanged: (_: unknown, listener: (value: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);
  const old = { updatedAt: 100, items: encodeCloudItems({ [key]: JSON.stringify(remote) }) };
  let server = old;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_: unknown, init?: RequestInit) => {
      if (init?.method === "PUT") server = JSON.parse(String(init.body));
      return new Response(JSON.stringify(server));
    }),
  );
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  await waitFor(() => expect(FakeEventSource.instances.length).toBeGreaterThan(0));
  const event = {
    id: "new-slot",
    title: "Consulta",
    subjectId: "subject-english",
    date: "2026-10-14",
    time: "07:00",
    durationMinutes: 25,
  };
  act(() =>
    writeSyncedStorage(key, JSON.stringify({ ...remote, events: [...remote.events, event] })),
  );
  await waitFor(() =>
    expect(
      JSON.parse(decodeCloudItems(server.items)[key]!).events.some(
        (item: { id: string }) => item.id === event.id,
      ),
    ).toBe(true),
  );
  await waitFor(() => expect(result.current.status).toBe("synced"));
  await act(async () => {
    FakeEventSource.instances.at(-1)!.emit("put", { path: "/", data: old });
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  expect(
    JSON.parse(localStorage.getItem(key)!).events.some(
      (item: { id: string }) => item.id === event.id,
    ),
  ).toBe(true);
  await act(async () => {
    server = { ...old, updatedAt: server.updatedAt + 1 };
    FakeEventSource.instances.at(-1)!.emit("put", { path: "/", data: server });
  });
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem(key)!).events.some(
        (item: { id: string }) => item.id === event.id,
      ),
    ).toBe(false),
  );
});

it("keeps timer and Pomodoro records made before reload when account data is older", async () => {
  const workspace = createInitialWorkspace();
  workspace.focusSessions = [
    {
      id: "timer-offline",
      subjectId: "subject-english",
      mode: "timer",
      durationMinutes: 4,
      completedAt: "2026-10-12T12:00:00Z",
    },
  ];
  const remote = createInitialWorkspace();
  remote.focusSessions = [
    {
      id: "pomodoro-remote",
      subjectId: "subject-english",
      mode: "pomodoro",
      durationMinutes: 25,
      completedAt: "2026-10-11T12:00:00Z",
    },
  ];
  localStorage.setItem("helena.account.v1", "focus-user");
  localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
  localStorage.setItem("noteoli.pomodoro-streak.v1", JSON.stringify(["2026-10-12"]));
  const activeSession = {
    mode: "timer",
    phase: "focus",
    completed: 0,
    duration: 25,
    secondsRemaining: 1500,
    elapsedMilliseconds: 120000,
    running: true,
    timerStartedAt: Date.now() - 120000,
    pomodoroDeadline: null,
    savedAt: Date.now(),
    deviceId: "pc",
  };
  localStorage.setItem("olena.focus-session.v1", JSON.stringify(activeSession));
  const user = { uid: "focus-user", getIdToken: vi.fn(async () => "token") };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onIdTokenChanged: () => () => undefined,
      onAuthStateChanged: (_: unknown, listener: (value: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);
  let uploaded: Record<string, string> = {};
  let writes = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_: unknown, init?: RequestInit) => {
      if (init?.method === "GET")
        return new Response(
          JSON.stringify({
            items: {
              "helenastudy.workspace.v1": JSON.stringify(remote),
              "noteoli.pomodoro-streak.v1": JSON.stringify(["2026-10-11"]),
            },
          }),
        );
      if (init?.method === "PUT") {
        writes++;
        uploaded = decodeCloudItems(JSON.parse(String(init.body)).items);
      }
      return new Response("null");
    }),
  );
  const first = renderHook(() => useCloudSync());
  await waitFor(() => expect(first.result.current.status).toBe("synced"));
  expect(JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).focusSessions).toHaveLength(
    2,
  );
  expect(JSON.parse(uploaded["helenastudy.workspace.v1"]!).focusSessions).toHaveLength(2);
  expect(JSON.parse(uploaded["noteoli.pomodoro-streak.v1"]!)).toEqual(["2026-10-11", "2026-10-12"]);
  expect(JSON.parse(uploaded["olena.focus-session.v1"]!).elapsedMilliseconds).toBe(120000);
  await waitFor(() => expect(FakeEventSource.instances.length).toBeGreaterThan(0));
  const previousWrites = writes;
  act(() =>
    FakeEventSource.instances.at(-1)!.emit("put", {
      path: "/",
      data: { items: { "helenastudy.workspace.v1": JSON.stringify(remote) } },
    }),
  );
  await waitFor(() => expect(writes).toBeGreaterThan(previousWrites));
  expect(JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).focusSessions).toHaveLength(
    2,
  );
  first.unmount();
  const second = renderHook(() => useCloudSync());
  await waitFor(() => expect(second.result.current.status).toBe("synced"));
  expect(JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).focusSessions).toHaveLength(
    2,
  );
});

it("migrates local math rewards into an existing account without this key", async () => {
  finishMathPlace("foundations", "offline-round", 150, () => 0.5);
  const user = {
    uid: "math-user",
    displayName: "Olena",
    email: "test@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onIdTokenChanged: () => () => undefined,
      onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
      signOut: vi.fn(async () => undefined),
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);
  let uploaded: Record<string, string> = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET")
        return new Response(JSON.stringify({ items: { "helenastudy.theme": "dark" } }), {
          status: 200,
        });
      if (init?.method === "PUT") uploaded = decodeCloudItems(JSON.parse(String(init.body)).items);
      return new Response("null", { status: 200 });
    }),
  );
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  expect(JSON.parse(uploaded[MATH_PLACE_REWARDS_KEY]!).foundations.points).toBe(150);
  expect(mathPlaceRewards("foundations").chests).toHaveLength(1);
  act(() => finishMathPlace("foundations", "online-round", 100, () => 0.5));
  await waitFor(() =>
    expect(JSON.parse(uploaded[MATH_PLACE_REWARDS_KEY]!).foundations.points).toBe(250),
  );
  // O GET desta fixture continua devolvendo uma cópia antiga e gera conflito.
  // Sair com descarte exige a escolha explícita apresentada no diálogo.
  await act(async () => result.current.signOut?.(true));
  expect(localStorage.getItem(MATH_PLACE_REWARDS_KEY)).toBeNull();
});

it("retries initial account loading automatically when the connection returns", async () => {
  const user = { uid: "offline-user", getIdToken: vi.fn(async () => "token") };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onIdTokenChanged: () => () => undefined,
      onAuthStateChanged: (_: unknown, listener: (value: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);
  let offline = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (offline) throw new Error("offline");
      return new Response("null");
    }),
  );
  const hook = renderHook(() => useCloudSync());
  await waitFor(() => expect(hook.result.current.status).toBe("offline"));
  offline = false;
  act(() => window.dispatchEvent(new Event("online")));
  await waitFor(() => expect(hook.result.current.status).toBe("synced"));
});

it("ignores the previous account's late response after switching users", async () => {
  const firstUser = {
    uid: "first",
    email: "first@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  const secondUser = { ...firstUser, uid: "second", email: "second@example.com" };
  let authenticate!: (value: typeof firstUser) => void;
  let resolveOld!: (value: Response) => void;
  localStorage.setItem("helena.account.v1", firstUser.uid);
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: firstUser },
    authApi: {
      onIdTokenChanged: () => () => undefined,
      onAuthStateChanged: (_: unknown, listener: typeof authenticate) => {
        authenticate = listener;
        listener(firstUser);
        return () => undefined;
      },
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET" && String(input).includes("/first/"))
        return new Promise<Response>((resolve) => {
          resolveOld = resolve;
        });
      return new Response("null");
    }),
  );
  const hook = renderHook(() => useCloudSync());
  await waitFor(() => expect(resolveOld).toBeDefined());
  act(() => authenticate(secondUser));
  await waitFor(() => expect(hook.result.current.status).toBe("synced"));
  const old = createInitialWorkspace();
  old.focusSessions = [
    { id: "private-first", subjectId: "", durationMinutes: 5, completedAt: "2026-10-12T12:00:00Z" },
  ];
  await act(async () =>
    resolveOld(
      new Response(JSON.stringify({ items: { "helenastudy.workspace.v1": JSON.stringify(old) } })),
    ),
  );
  expect(hook.result.current.email).toBe(secondUser.email);
  expect(localStorage.getItem("helenastudy.workspace.v1") ?? "").not.toContain("private-first");
});

it("migrates to safe Firebase keys on stateV2 without writing over the legacy account node", async () => {
  const user = { uid: "wire-user", getIdToken: vi.fn(async () => "token") };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onIdTokenChanged: () => () => undefined,
      onAuthStateChanged: (_: unknown, listener: (value: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);
  const legacy = {
    version: 1,
    updatedAt: 1,
    items: { "helenastudy.workspace.v1": JSON.stringify(createInitialWorkspace()) },
  };
  let modern: typeof legacy | null = null;
  const writes: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (init?.method === "GET")
        return new Response(JSON.stringify(path.includes("stateV2.json") ? modern : legacy));
      writes.push(path);
      const wire = JSON.parse(String(init?.body));
      const invalid = Object.keys(wire.items).some((key) => /[.$#[\]/]/.test(key));
      if (invalid) return new Response("Invalid Firebase child name", { status: 400 });
      modern = wire;
      return new Response("null");
    }),
  );
  const hook = renderHook(() => useCloudSync());
  await waitFor(() => expect(hook.result.current.status).toBe("synced"));
  expect(writes.length).toBeGreaterThan(0);
  expect(writes.every((path) => path.includes("/wire-user/stateV2.json"))).toBe(true);
  expect(decodeCloudItems(modern!.items)).toEqual(legacy.items);
  expect(legacy.version).toBe(1);
  expect(Object.keys(modern!.items)).toEqual(Object.keys(encodeCloudItems(legacy.items)));
});

it("mantém alteração pendente após falha e permite tentar a sincronização novamente", async () => {
  const user = {
    uid: "user-1",
    displayName: "Ana",
    email: "helena@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  const signOut = vi.fn(async () => undefined);
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onIdTokenChanged: () => () => undefined,
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

it.each(["during", "before", "another-account"] as const)(
  "não deixa um GET antigo apagar configuração pendente da própria conta: %s",
  async (timing) => {
    // Reproduz o login com Google: assim que a pessoa autentica,
    // onAuthStateChanged dispara e o hook busca o estado na nuvem (GET) ao
    // mesmo tempo em que GoogleLogin acabou de gravar localmente que o
    // onboarding foi concluido. Se o GET (rede, mais lento) responder DEPOIS
    // dessa gravacao com um instantaneo antigo da nuvem, ele nao pode apagar
    // a marca de conclusao que acabou de ser salva.
    const user = {
      uid: "user-1",
      displayName: "Ana",
      email: "helena@example.com",
      getIdToken: vi.fn(async () => "token"),
    };
    vi.mocked(getFirebaseAccountServices).mockResolvedValue({
      auth: { currentUser: user },
      authApi: {
        onIdTokenChanged: () => () => undefined,
        onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
          listener(user);
          return () => undefined;
        },
        signOut: vi.fn(),
      },
      databaseURL: "https://project.firebaseio.com",
    } as never);

    let resolveGet: (value: Response) => void = () => undefined;
    let cloudResponse: Response | undefined;
    const puts: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "GET") {
          if (cloudResponse) return cloudResponse.clone();
          return new Promise<Response>((resolve) => {
            resolveGet = (response) => {
              cloudResponse = response.clone();
              resolve(response);
            };
          });
        }
        puts.push(init?.body as string);
        return new Response("null", { status: 200 });
      }),
    );

    const answers = ONBOARDING_OPTIONS.map((options, index) =>
      index === 4 ? [options[0]!] : options[0]!,
    );
    const localOnboarding = JSON.stringify(
      timing === "during"
        ? { completed: true }
        : {
            completed: true,
            answers,
            configuration: prepareOnboarding(answers, "onboarding-v1-0123456789abcdef01234567"),
            configurationOwner: timing === "another-account" ? "other-user" : user.uid,
            configurationPending: true,
          },
    );
    if (timing !== "during") localStorage.setItem("helena.onboarding.v1", localOnboarding);
    const { result } = renderHook(() => useCloudSync());
    await waitFor(() => expect(result.current.status).toBe("loading"));

    // A gravacao local (equivalente a GoogleLogin concluindo o onboarding)
    // acontece ENQUANTO o GET ainda esta pendente.
    if (timing === "during") act(() => writeSyncedStorage("helena.onboarding.v1", localOnboarding));

    // A nuvem responde com um instantaneo antigo, sem o onboarding concluido.
    act(() =>
      resolveGet(
        new Response(
          JSON.stringify({
            items: { "helena.onboarding.v1": JSON.stringify({ completed: false }) },
          }),
          { status: 200 },
        ),
      ),
    );

    await waitFor(() => expect(result.current.status).toBe("synced"));

    expect(JSON.parse(localStorage.getItem("helena.onboarding.v1") ?? "{}")).toEqual(
      timing === "another-account" ? { completed: false } : JSON.parse(localOnboarding),
    );
    expect(puts).toHaveLength(timing === "another-account" ? 0 : 1);
    if (timing !== "another-account")
      expect(decodeCloudItems(JSON.parse(puts[0]!).items)["helena.onboarding.v1"]).toBe(
        localOnboarding,
      );
  },
);

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
      onIdTokenChanged: () => () => undefined,
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
  let cloudResponse: Response | undefined;
  const puts: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET") {
        if (cloudResponse) return cloudResponse.clone();
        return new Promise<Response>((resolve) => {
          resolveGet = (response) => {
            cloudResponse = response.clone();
            resolve(response);
          };
        });
      }
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
  expect(decodeCloudItems(JSON.parse(puts[0]!).items)["helena.profile.v1"]).toBe("avatar-da-nuvem");
});

it("concilia alterações simultâneas por chave e preserva o conflito local", async () => {
  const user = {
    uid: "user-1",
    displayName: "Ana",
    email: "helena@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onIdTokenChanged: () => () => undefined,
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

  expect(decodeCloudItems(JSON.parse(puts.at(-1)!).items)).toEqual({
    "helena.profile.v1": "local",
    "helenastudy.theme": "dark",
  });
  expect(localStorage.getItem("helenastudy.sync-conflict.v1")).toContain("helena.profile.v1");
});

it("mescla cadernos adicionados em cada dispositivo, em vez de descartar um dos dois", async () => {
  // Reproduz o relato de conteúdo diferente entre PC e celular: cada dispositivo cria um
  // caderno diferente desde a última sincronização. Antes desta mudança, o merge tratava o
  // espaço de estudos inteiro como um bloco só e um dos dois cadernos desaparecia.
  const user = {
    uid: "user-1",
    displayName: "Ana",
    email: "helena@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onIdTokenChanged: () => () => undefined,
      onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
      signOut: vi.fn(),
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);

  const base = createInitialWorkspace();
  const fromPhone = { ...base, notebooks: [notebook("do-celular", "Caderno do celular")] };

  let getCount = 0;
  const puts: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET") {
        getCount += 1;
        return new Response(
          JSON.stringify({
            items: {
              "helenastudy.workspace.v1": JSON.stringify(getCount === 1 ? base : fromPhone),
            },
          }),
          { status: 200 },
        );
      }
      puts.push(init?.body as string);
      return new Response("null", { status: 200 });
    }),
  );

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));

  const fromPc = { ...base, notebooks: [notebook("do-pc", "Caderno do PC")] };
  act(() => writeSyncedStorage("helenastudy.workspace.v1", JSON.stringify(fromPc)));
  await waitFor(() => expect(result.current.status).toBe("synced"));

  const uploaded = decodeCloudItems(JSON.parse(puts.at(-1)!).items)[
    "helenastudy.workspace.v1"
  ] as string;
  const mergedNotebooks = (JSON.parse(uploaded) as WorkspaceState).notebooks.map((n) => n.id);
  expect(mergedNotebooks.sort()).toEqual(["do-celular", "do-pc"]);
  expect(localStorage.getItem("helenastudy.sync-conflict.v1")).toBeNull();
});

it("recebe uma mudança de outro dispositivo pelo stream do Firebase, sem esperar nenhum polling", async () => {
  const user = {
    uid: "user-1",
    displayName: "Ana",
    email: "helena@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onIdTokenChanged: () => () => undefined,
      onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
      signOut: vi.fn(),
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET")
        return new Response(JSON.stringify({ items: { "helenastudy.theme": "light" } }), {
          status: 200,
        });
      return new Response("null", { status: 200 });
    }),
  );

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));

  const stream = FakeEventSource.instances[0]!;
  expect(stream.url).toContain("/users/user-1/stateV2.json");
  act(() =>
    stream.emit("put", {
      path: "/",
      data: { items: { "helenastudy.theme": "dark" } },
    }),
  );

  await waitFor(() => expect(localStorage.getItem("helenastudy.theme")).toBe("dark"));
  expect(result.current.status).toBe("synced");
});

it("reabre o stream com um token novo quando o login renova (onIdTokenChanged)", async () => {
  const user = {
    uid: "user-1",
    displayName: "Ana",
    email: "helena@example.com",
    getIdToken: vi.fn(async () => "token-1"),
  };
  let refreshToken: (() => void) | undefined;
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onIdTokenChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
        refreshToken = () => listener({ ...user, getIdToken: vi.fn(async () => "token-2") });
        return () => undefined;
      },
      onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
      signOut: vi.fn(),
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET")
        return new Response(JSON.stringify({ items: {} }), { status: 200 });
      return new Response("null", { status: 200 });
    }),
  );

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
  expect(FakeEventSource.instances[0]!.url).toContain("auth=token-1");

  await act(async () => refreshToken?.());

  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(2));
  expect(FakeEventSource.instances[0]!.closed).toBe(true);
  expect(FakeEventSource.instances[1]!.url).toContain("auth=token-2");
});

it("tenta subir de novo uma mudança que falhou por falta de rede quando a conexão volta", async () => {
  const user = {
    uid: "user-1",
    displayName: "Ana",
    email: "helena@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onIdTokenChanged: () => () => undefined,
      onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
      signOut: vi.fn(),
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);
  let online = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "GET")
        return new Response(JSON.stringify({ items: {} }), { status: 200 });
      if (!online) throw new Error("offline");
      return new Response("null", { status: 200 });
    }),
  );

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));

  online = false;
  act(() => writeSyncedStorage("helena.soloProgress", "4"));
  await waitFor(() => expect(result.current.status).toBe("offline"));

  online = true;
  act(() => window.dispatchEvent(new Event("online")));
  await waitFor(() => expect(result.current.status).toBe("synced"));
});

function signedInServices(user: { uid: string; displayName: string; email: string }) {
  const account = { ...user, getIdToken: vi.fn(async () => "token") };
  const signOut = vi.fn(async () => undefined);
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: account },
    authApi: {
      onIdTokenChanged: () => () => undefined,
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

it("tenta enviar alterações ao sair e conserva os dados se o envio falhar", async () => {
  const signOut = signedInServices({
    uid: "safe-exit",
    displayName: "Ana",
    email: "ana@example.com",
  });
  let fail = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (fail && init?.method === "PUT") throw new Error("offline");
      return new Response("null", { status: 200 });
    }),
  );
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  fail = true;
  act(() => writeSyncedStorage("helena.profile.v1", JSON.stringify({ name: "Novo nome" })));
  await act(async () => {
    await expect(result.current.signOut?.()).rejects.toThrow("sync-pending");
  });
  expect(signOut).not.toHaveBeenCalled();
  expect(localStorage.getItem("helena.profile.v1")).toContain("Novo nome");
  await act(async () => result.current.signOut?.(true));
  expect(signOut).toHaveBeenCalledOnce();
  expect(localStorage.getItem("helena.profile.v1")).toBeNull();
});

it("token travado deixa de mostrar carregamento infinito e permite descarte explícito", async () => {
  const signOut = signedInServices({
    uid: "token-exit",
    displayName: "Ana",
    email: "ana@example.com",
  });
  const services = await getFirebaseAccountServices();
  vi.spyOn(services.auth.currentUser!, "getIdToken").mockImplementation(
    () => new Promise<string>(() => {}),
  );
  const controller = new AbortController();
  const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
  try {
    const { result } = renderHook(() => useCloudSync());
    await waitFor(() => expect(result.current.authenticated).toBe(true));
    act(() => controller.abort());
    await waitFor(() => expect(result.current.status).toBe("offline"));
    await act(async () => {
      await expect(result.current.signOut?.()).rejects.toThrow("sync-not-ready");
    });
    expect(signOut).not.toHaveBeenCalled();
    await act(async () => result.current.signOut?.(true));
    expect(signOut).toHaveBeenCalledOnce();
  } finally {
    timeout.mockRestore();
  }
});

it("falha da autenticação ao sair não desliga a sincronização", async () => {
  const signOut = signedInServices({
    uid: "retry-exit",
    displayName: "Ana",
    email: "ana@example.com",
  });
  signOut.mockRejectedValueOnce(new Error("auth-failure"));
  const fetchMock = vi.fn(async () => new Response("null", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  await act(async () => {
    await expect(result.current.signOut?.()).rejects.toThrow("auth-failure");
  });
  const before = fetchMock.mock.calls.length;
  act(() => writeSyncedStorage("helena.profile.v1", JSON.stringify({ name: "Depois da falha" })));
  await waitFor(() => expect(result.current.status).toBe("synced"));
  expect(fetchMock.mock.calls.length).toBeGreaterThan(before);
});

it("ao sair, apaga histórico, rascunhos e sessões deste aparelho e não chama mais o Google Agenda", async () => {
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
  expect(fetchMock).not.toHaveBeenCalledWith(
    expect.stringContaining("/api/google-calendar"),
    expect.anything(),
  );
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

it("combines notification reading from both devices during login", async () => {
  signedInServices({ uid: "ana", displayName: "Ana", email: "ana@example.com" });
  const key = "helena.systemUpdates.read.v1";
  localStorage.setItem(key, "[408]");
  const uploads: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") uploads.push(String(init.body));
      return new Response(JSON.stringify({ version: 1, updatedAt: 1, items: { [key]: "[409]" } }), {
        status: 200,
      });
    }),
  );
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  expect(localStorage.getItem(key)).toBe("[408,409]");
  expect(uploads.join("")).toContain("408,409");
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
    displayName: "Ana",
    email: "helena@example.com",
    getIdToken: vi.fn(async () => "token"),
  };
  const calls: string[] = [];
  const authApi = {
    onAuthStateChanged: (_auth: unknown, listener: (current: typeof user) => void) => {
      listener(user);
      return () => undefined;
    },
    onIdTokenChanged: () => () => undefined,
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
    "delete /api/profile-handle",
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

function signedInUser(uid: string) {
  const user = { uid, getIdToken: vi.fn(async () => "token") };
  localStorage.setItem("helena.account.v1", uid);
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: {
      onIdTokenChanged: () => () => undefined,
      onAuthStateChanged: (_: unknown, listener: (value: typeof user) => void) => {
        listener(user);
        return () => undefined;
      },
    },
    databaseURL: "https://project.firebaseio.com",
  } as never);
}

function accountServer() {
  const calls: { method: string; url: string }[] = [];
  let server = { updatedAt: 100, items: encodeCloudItems({ "helenastudy.theme": "light" }) };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ method, url: String(input) });
      if (method === "PUT") {
        server = JSON.parse(String(init?.body));
        return new Response(null, { status: 204 });
      }
      return new Response(JSON.stringify(server));
    }),
  );
  return { calls, puts: () => calls.filter((call) => call.method === "PUT") };
}

it("migra XP legado ao perfil da conta e envia novas recompensas sem chaves não permitidas", async () => {
  signedInUser("xp-user");
  localStorage.setItem(ROOM_XP_KEY, JSON.stringify({ total: 100, receipts: ["old"] }));
  const { puts } = accountServer();
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  expect(readRoomXp()).toBe(100);
  act(() => {
    recordRoomXp({ id: "new", xp: 25, place: 1, completedAt: Date.now() });
  });
  await waitFor(() => expect(puts().length).toBeGreaterThan(0));
  await waitFor(() => expect(result.current.status).toBe("synced"));
  const payload = JSON.parse(
    String(
      vi
        .mocked(fetch)
        .mock.calls.filter((call) => call[1]?.method === "PUT")
        .at(-1)?.[1]?.body,
    ),
  );
  const items = decodeCloudItems(payload.items);
  expect(JSON.parse(items["helena.profile.v1"]!).xpLedger.total).toBe(125);
  expect(items[ROOM_XP_KEY]).toBeUndefined();
});

it("envia o estado com print=silent, para o Firebase não devolver tudo na resposta", async () => {
  signedInUser("silent-user");
  const { calls, puts } = accountServer();
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  act(() => writeSyncedStorage("helenastudy.theme", "dark"));
  await waitFor(() => expect(puts()).toHaveLength(1));
  await waitFor(() => expect(result.current.status).toBe("synced"));
  expect(puts()[0]!.url).toContain("&print=silent");
  expect(
    calls.filter((call) => call.method === "GET").every((call) => !call.url.includes("print=")),
  ).toBe(true);
});

it("junta mudanças seguidas em um só envio em vez de subir o estado a cada uma", async () => {
  signedInUser("burst-user");
  const { puts } = accountServer();
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  for (const value of ["dark", "light", "dark", "system"]) {
    act(() => writeSyncedStorage("helenastudy.theme", value));
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  expect(puts()).toHaveLength(0);
  await waitFor(() => expect(puts()).toHaveLength(1));
  await waitFor(() => expect(result.current.status).toBe("synced"));
  await new Promise((resolve) => setTimeout(resolve, 600));
  expect(puts()).toHaveLength(1);
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls.at(-1)?.[1]?.body)).items).toBeDefined();
});

it("envia na hora, sem esperar o intervalo, quando a página é escondida", async () => {
  signedInUser("hidden-user");
  const { puts } = accountServer();
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  act(() => writeSyncedStorage("helenastudy.theme", "dark"));
  expect(puts()).toHaveLength(0);
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  try {
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(puts()).toHaveLength(1), { timeout: 1500 });
  } finally {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  }
});
