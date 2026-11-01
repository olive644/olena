import { act, configure, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { writeSyncedStorage } from "../data/synced-storage";
import { encodeCloudItems, decodeCloudItems } from "../data/cloud-state-codec";
import { createInitialWorkspace, type WorkspaceState } from "../domain/workspace";
import { useCloudSync } from "./use-cloud-sync";
import { readAccessPreferences, writeAccessPreferences } from "../data/account-access-preferences";
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

/** Itens que uma escrita (PUT do nó inteiro ou PATCH por chave) levou para a nuvem. */
function writtenItems(init: RequestInit | undefined): Record<string, string> {
  const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
  if (init?.method !== "PATCH") return decodeCloudItems(body["items"]);
  const wire: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(body))
    if (path.startsWith("items/")) wire[path.slice("items/".length)] = value;
  return decodeCloudItems(wire);
}

type ServerNode = { version?: number; updatedAt?: number; items: Record<string, string> };

/**
 * Simula o Realtime Database o suficiente para o protocolo de sincronização: GET do nó inteiro,
 * GET só de updatedAt (leitura leve antes de salvar), PUT (substitui) e PATCH multi-caminho
 * (`items/<chave>` e `updatedAt`). Guarda cada chamada para os testes conferirem o tráfego.
 */
function firebaseServer(initial: ServerNode | null = null) {
  const server = {
    node: initial,
    failWrites: false,
    failPatch: false,
    calls: [] as { method: string; url: string; body: unknown }[],
    fetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const url = String(input);
      const body = init?.body === undefined ? undefined : JSON.parse(String(init.body));
      server.calls.push({ method, url, body });
      if (method === "GET") {
        if (url.includes("/updatedAt.json")) return Response.json(server.node?.updatedAt ?? null);
        return Response.json(server.node);
      }
      if (server.failWrites || (server.failPatch && method === "PATCH"))
        return new Response("failure", { status: 503 });
      if (method === "PUT") server.node = body as ServerNode;
      if (method === "PATCH") {
        const next: ServerNode = server.node
          ? { ...server.node, items: { ...server.node.items } }
          : { version: 2, items: {} };
        for (const [path, value] of Object.entries(body as Record<string, unknown>)) {
          if (path === "updatedAt") next.updatedAt = value as number;
          else if (value === null) delete next.items[path.slice("items/".length)];
          else next.items[path.slice("items/".length)] = value as string;
        }
        server.node = next;
      }
      return new Response("null", { status: 200 });
    }),
    writes: () => server.calls.filter((call) => call.method === "PUT" || call.method === "PATCH"),
    fullGets: () =>
      server.calls.filter((call) => call.method === "GET" && !call.url.includes("/updatedAt.json")),
    updatedAtGets: () =>
      server.calls.filter((call) => call.method === "GET" && call.url.includes("/updatedAt.json")),
    items: () => decodeCloudItems(server.node?.items),
  };
  return server;
}

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
  const server = firebaseServer(old);
  vi.stubGlobal("fetch", server.fetch);
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
      JSON.parse(server.items()[key]!).events.some((item: { id: string }) => item.id === event.id),
    ).toBe(true),
  );
  await waitFor(() => expect(result.current.status).toBe("synced"));
  await act(async () => {
    FakeEventSource.instances.at(-1)!.emit("put", { path: "/", data: old.updatedAt });
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  expect(
    JSON.parse(localStorage.getItem(key)!).events.some(
      (item: { id: string }) => item.id === event.id,
    ),
  ).toBe(true);
  await act(async () => {
    server.node = { ...old, updatedAt: server.node!.updatedAt! + 1 };
    FakeEventSource.instances.at(-1)!.emit("put", { path: "/", data: server.node.updatedAt });
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
  const server = firebaseServer({
    updatedAt: 100,
    items: encodeCloudItems({
      "helenastudy.workspace.v1": JSON.stringify(remote),
      "noteoli.pomodoro-streak.v1": JSON.stringify(["2026-10-11"]),
    }),
  });
  vi.stubGlobal("fetch", server.fetch);
  const first = renderHook(() => useCloudSync());
  await waitFor(() => expect(first.result.current.status).toBe("synced"));
  expect(JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).focusSessions).toHaveLength(
    2,
  );
  expect(JSON.parse(server.items()["helenastudy.workspace.v1"]!).focusSessions).toHaveLength(2);
  expect(JSON.parse(server.items()["noteoli.pomodoro-streak.v1"]!)).toEqual([
    "2026-10-11",
    "2026-10-12",
  ]);
  expect(JSON.parse(server.items()["olena.focus-session.v1"]!).elapsedMilliseconds).toBe(120000);
  await waitFor(() => expect(FakeEventSource.instances.length).toBeGreaterThan(0));
  const previousWrites = server.writes().length;
  // Outro aparelho republica a versão antiga da conta, com updatedAt mais novo.
  server.node = {
    updatedAt: server.node!.updatedAt! + 1,
    items: encodeCloudItems({ "helenastudy.workspace.v1": JSON.stringify(remote) }),
  };
  act(() =>
    FakeEventSource.instances.at(-1)!.emit("put", { path: "/", data: server.node!.updatedAt }),
  );
  await waitFor(() => expect(server.writes().length).toBeGreaterThan(previousWrites));
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
  const server = firebaseServer({
    updatedAt: 100,
    items: encodeCloudItems({ "helenastudy.theme": "dark" }),
  });
  vi.stubGlobal("fetch", server.fetch);
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  expect(JSON.parse(server.items()[MATH_PLACE_REWARDS_KEY]!).foundations.points).toBe(150);
  expect(mathPlaceRewards("foundations").chests).toHaveLength(1);
  act(() => finishMathPlace("foundations", "online-round", 100, () => 0.5));
  await waitFor(() =>
    expect(JSON.parse(server.items()[MATH_PLACE_REWARDS_KEY]!).foundations.points).toBe(250),
  );
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

  const server = firebaseServer();
  vi.stubGlobal("fetch", server.fetch);

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));

  server.failWrites = true;
  act(() => writeSyncedStorage("helena.soloProgress", "3"));
  await waitFor(() => expect(result.current.status).toBe("offline"));
  expect(server.items()["helena.soloProgress"]).toBeUndefined();

  server.failWrites = false;
  act(() => result.current.syncNow?.());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  expect(server.items()["helena.soloProgress"]).toBe("3");

  writeAccessPreferences(localStorage, user.uid, { consent: true });
  await act(async () => result.current.signOut?.());
  expect(signOut).toHaveBeenCalledOnce();
  expect(localStorage.getItem("helena.soloProgress")).toBeNull();
  expect(readAccessPreferences(localStorage, user.uid).consent).toBe(true);
  expect(readAccessPreferences(localStorage, "another-account").consent).toBe(false);
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
    const puts: Record<string, string>[] = [];
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
        puts.push(writtenItems(init));
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
      expect(puts[0]!["helena.onboarding.v1"]).toBe(localOnboarding);
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
  const puts: Record<string, string>[] = [];
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
      puts.push(writtenItems(init));
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
  // Só a mudança nova sobe: o avatar da nuvem já está lá e não é reenviado.
  expect(puts[0]).toEqual({ "helena.onboarding.v1": "nova sessão" });
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

  const server = firebaseServer({
    updatedAt: 100,
    items: encodeCloudItems({ "helena.profile.v1": "base", "helenastudy.theme": "light" }),
  });
  vi.stubGlobal("fetch", server.fetch);

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));

  // Outro aparelho alterou as mesmas chaves e publicou depois (updatedAt maior).
  server.node = {
    updatedAt: 200,
    items: encodeCloudItems({ "helena.profile.v1": "remote", "helenastudy.theme": "dark" }),
  };
  act(() => writeSyncedStorage("helena.profile.v1", "local"));
  await waitFor(() => expect(result.current.status).toBe("conflict"));

  expect(server.items()).toEqual({
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

  const server = firebaseServer({
    updatedAt: 100,
    items: encodeCloudItems({ "helenastudy.workspace.v1": JSON.stringify(base) }),
  });
  vi.stubGlobal("fetch", server.fetch);

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));

  // O celular salvou o caderno dele antes de o PC salvar o dele.
  server.node = {
    updatedAt: 200,
    items: encodeCloudItems({ "helenastudy.workspace.v1": JSON.stringify(fromPhone) }),
  };
  const fromPc = { ...base, notebooks: [notebook("do-pc", "Caderno do PC")] };
  act(() => writeSyncedStorage("helenastudy.workspace.v1", JSON.stringify(fromPc)));
  await waitFor(() => expect(result.current.status).toBe("synced"));

  const uploaded = server.items()["helenastudy.workspace.v1"] as string;
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
  const server = firebaseServer({
    updatedAt: 100,
    items: encodeCloudItems({ "helenastudy.theme": "light" }),
  });
  vi.stubGlobal("fetch", server.fetch);

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));

  // O stream escuta só o carimbo updatedAt, nunca o estado inteiro.
  const stream = FakeEventSource.instances[0]!;
  expect(stream.url).toContain("/users/user-1/stateV2/updatedAt.json");
  const fullGetsBefore = server.fullGets().length;

  // Eventos que não trazem nada novo (reenvio do mesmo carimbo, valor antigo, lixo) não baixam nada.
  act(() => {
    stream.emit("put", { path: "/", data: 100 });
    stream.emit("put", { path: "/", data: 50 });
    stream.emit("put", { path: "/", data: null });
    stream.emit("put", { path: "/", data: { items: {} } });
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(server.fullGets()).toHaveLength(fullGetsBefore);

  // Outro aparelho publicou: carimbo maior, então baixa o estado uma vez.
  server.node = { updatedAt: 200, items: encodeCloudItems({ "helenastudy.theme": "dark" }) };
  act(() => {
    stream.emit("put", { path: "/", data: 200 });
    stream.emit("put", { path: "/", data: 200 });
  });

  await waitFor(() => expect(localStorage.getItem("helenastudy.theme")).toBe("dark"));
  expect(result.current.status).toBe("synced");
  expect(server.fullGets().length - fullGetsBefore).toBeLessThanOrEqual(2);
});

it("não baixa o estado de novo por causa do eco da própria gravação deste aparelho", async () => {
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
  const server = firebaseServer({
    updatedAt: 100,
    items: encodeCloudItems({ "helenastudy.theme": "light" }),
  });
  vi.stubGlobal("fetch", server.fetch);

  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));

  act(() => writeSyncedStorage("helenastudy.theme", "dark"));
  await waitFor(() => expect(server.writes()).toHaveLength(1));
  await waitFor(() => expect(result.current.status).toBe("synced"));

  // O Firebase devolve ao próprio autor o carimbo que ele acabou de gravar.
  const fullGetsBefore = server.fullGets().length;
  act(() => FakeEventSource.instances[0]!.emit("put", { path: "/", data: server.node!.updatedAt }));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(server.fullGets()).toHaveLength(fullGetsBefore);
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
      if (fail && (init?.method === "PUT" || init?.method === "PATCH")) throw new Error("offline");
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
      if (init?.method === "PUT" || init?.method === "PATCH") uploads.push(String(init.body));
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
  const server = firebaseServer({ updatedAt: 1, items: { [key]: "[409]" } });
  vi.stubGlobal("fetch", server.fetch);
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  expect(localStorage.getItem(key)).toBe("[408,409]");
  expect(server.items()[key]).toBe("[408,409]");
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
  const server = firebaseServer({
    updatedAt: 100,
    version: 2,
    items: encodeCloudItems({ "helenastudy.theme": "light" }),
  });
  vi.stubGlobal("fetch", server.fetch);
  return { server, calls: server.calls, puts: server.writes };
}

it("migra XP legado ao perfil da conta e envia novas recompensas sem chaves não permitidas", async () => {
  signedInUser("xp-user");
  localStorage.setItem(ROOM_XP_KEY, JSON.stringify({ total: 100, receipts: ["old"] }));
  const { puts, server } = accountServer();
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  expect(readRoomXp()).toBe(100);
  act(() => {
    recordRoomXp({ id: "new", xp: 25, place: 1, completedAt: Date.now() });
  });
  await waitFor(() => expect(puts().length).toBeGreaterThan(0));
  await waitFor(() => expect(result.current.status).toBe("synced"));
  const items = server.items();
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
  const { puts, server } = accountServer();
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
  expect(server.items()["helenastudy.theme"]).toBe("system");
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

const FOCUS_KEY = "olena.focus-session.v1";
const wire = (key: string) => Object.keys(encodeCloudItems({ [key]: "x" }))[0]!;

it("antes de salvar lê só o updatedAt e não baixa o estado inteiro quando a nuvem não mudou", async () => {
  signedInUser("probe-user");
  const { server } = accountServer();
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  const fullGetsAfterLoad = server.fullGets().length;
  for (const value of ["dark", "system"]) {
    act(() => writeSyncedStorage("helenastudy.theme", value));
    await waitFor(() => expect(server.items()["helenastudy.theme"]).toBe(value));
    await waitFor(() => expect(result.current.status).toBe("synced"));
  }
  expect(server.updatedAtGets().length).toBeGreaterThanOrEqual(2);
  expect(server.fullGets()).toHaveLength(fullGetsAfterLoad);
  for (const call of server.updatedAtGets()) expect(call.url).toContain("/stateV2/updatedAt.json");
});

it("baixa o estado inteiro antes de salvar só quando a nuvem tem um updatedAt mais novo", async () => {
  signedInUser("newer-user");
  const { server } = accountServer();
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  const fullGetsAfterLoad = server.fullGets().length;
  server.node = {
    version: 2,
    updatedAt: 500,
    items: encodeCloudItems({ "helenastudy.theme": "light", "helena.soloProgress": "9" }),
  };
  act(() => writeSyncedStorage("helenastudy.theme", "dark"));
  await waitFor(() => expect(server.items()["helenastudy.theme"]).toBe("dark"));
  expect(server.fullGets().length).toBe(fullGetsAfterLoad + 1);
  await waitFor(() => expect(localStorage.getItem("helena.soloProgress")).toBe("9"));
});

it("envia só as chaves alteradas, em um PATCH que também atualiza o updatedAt", async () => {
  signedInUser("patch-user");
  const { server } = accountServer();
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  const writesAfterLoad = server.writes().length;
  act(() => writeSyncedStorage("helena.soloProgress", "7"));
  await waitFor(() => expect(server.writes().length).toBe(writesAfterLoad + 1));
  const write = server.writes().at(-1)!;
  expect(write.method).toBe("PATCH");
  expect(write.url).toContain("&print=silent");
  const body = write.body as Record<string, unknown>;
  expect(Object.keys(body).sort()).toEqual(
    ["updatedAt", `items/${wire("helena.soloProgress")}`].sort(),
  );
  expect(body[`items/${wire("helena.soloProgress")}`]).toBe("7");
  expect(body["updatedAt"]).toBeGreaterThan(100);
  expect(server.items()["helenastudy.theme"]).toBe("light");
});

it("grava a sessão de Foco sozinha, sem reenviar o estado e sem mexer no updatedAt", async () => {
  signedInUser("focus-user");
  const { server } = accountServer();
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  const stamp = server.node!.updatedAt;
  const writesAfterLoad = server.writes().length;
  const snapshot = JSON.stringify({ elapsedMilliseconds: 30000 });
  act(() => writeSyncedStorage(FOCUS_KEY, snapshot));
  await waitFor(() => expect(server.writes().length).toBe(writesAfterLoad + 1));
  const write = server.writes().at(-1)!;
  expect(write.method).toBe("PATCH");
  expect(write.body).toEqual({ [`items/${wire(FOCUS_KEY)}`]: snapshot });
  expect(server.items()[FOCUS_KEY]).toBe(snapshot);
  expect(server.node!.updatedAt).toBe(stamp);
  await waitFor(() => expect(result.current.status).toBe("synced"));
});

it("se o PATCH falhar, cai para o envio do estado inteiro (PUT) em vez de perder a mudança", async () => {
  signedInUser("fallback-user");
  const { server } = accountServer();
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  server.failPatch = true;
  act(() => writeSyncedStorage("helena.soloProgress", "5"));
  await waitFor(() => expect(server.items()["helena.soloProgress"]).toBe("5"));
  expect(server.writes().map((call) => call.method)).toContain("PUT");
  expect(server.items()["helenastudy.theme"]).toBe("light");
  await waitFor(() => expect(result.current.status).toBe("synced"));
});

it("o primeiro envio de uma conta sem dados continua sendo o estado inteiro (PUT)", async () => {
  signedInUser("first-user");
  localStorage.setItem("helenastudy.theme", "dark");
  const server = firebaseServer(null);
  vi.stubGlobal("fetch", server.fetch);
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe("synced"));
  await waitFor(() => expect(server.writes().length).toBeGreaterThan(0));
  expect(server.writes()[0]!.method).toBe("PUT");
  expect(server.items()["helenastudy.theme"]).toBe("dark");
  expect(server.node!.version).toBe(2);
});
