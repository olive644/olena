import { describe, expect, it, vi } from "vitest";
import { openIndexedWorkspaceStore } from "./indexed-workspace-store";

// jsdom não implementa IndexedDB, então este fake reproduz só o pedaço da API real que o
// espelho usa (abrir com upgrade, uma transação, get e put), com os mesmos eventos
// assíncronos por microtarefa que o navegador de verdade dispara.
function fakeIndexedDbFactory(): IDBFactory {
  const databases = new Map<
    string,
    { version: number; stores: Map<string, Map<string, unknown>> }
  >();

  function fakeRequest<T>(compute: () => T): IDBRequest<T> {
    const request = {} as IDBRequest<T>;
    queueMicrotask(() => {
      try {
        (request as { result: T }).result = compute();
        request.onsuccess?.(new Event("success"));
      } catch (error) {
        (request as { error: unknown }).error = error;
        request.onerror?.(new Event("error"));
      }
    });
    return request;
  }

  return {
    open(name: string, version?: number) {
      const request = {} as IDBOpenDBRequest;
      queueMicrotask(() => {
        const existing = databases.get(name);
        const isNew = !existing;
        const record = existing ?? { version: version ?? 1, stores: new Map() };
        databases.set(name, record);
        const fakeDb = {
          objectStoreNames: { contains: (storeName: string) => record.stores.has(storeName) },
          createObjectStore(storeName: string) {
            record.stores.set(storeName, new Map());
            return {} as IDBObjectStore;
          },
          transaction(storeName: string) {
            const store = record.stores.get(storeName)!;
            // A transação retornada precisa ser a MESMA referência que o microtask fecha:
            // se ela for espalhada num objeto novo depois, quem chama define oncomplete
            // no objeto novo, e o microtask nunca vê essa atribuição.
            const tx = {
              objectStore: () => ({
                get: (key: string) => fakeRequest(() => store.get(key)),
                put: (value: unknown, key: string) => {
                  store.set(key, value);
                  return fakeRequest(() => key);
                },
              }),
            } as unknown as IDBTransaction;
            queueMicrotask(() => tx.oncomplete?.(new Event("complete")));
            return tx;
          },
        } as unknown as IDBDatabase;
        (request as { result: IDBDatabase }).result = fakeDb;
        if (isNew) request.onupgradeneeded?.(new Event("upgradeneeded") as IDBVersionChangeEvent);
        request.onsuccess?.(new Event("success"));
      });
      return request;
    },
  } as unknown as IDBFactory;
}

describe("espelho do espaço de estudos em IndexedDB", () => {
  it("sem leitura anterior, devolve indefinido", async () => {
    const store = openIndexedWorkspaceStore(fakeIndexedDbFactory())!;
    expect(await store.get()).toBeUndefined();
  });

  it("grava e lê de volta o mesmo conteúdo", async () => {
    const store = openIndexedWorkspaceStore(fakeIndexedDbFactory())!;
    await store.set('{"ola":"mundo"}');
    expect(await store.get()).toBe('{"ola":"mundo"}');
    await store.set('{"ola":"de novo"}');
    expect(await store.get()).toBe('{"ola":"de novo"}');
  });

  it("reaproveita a mesma conexão em chamadas seguidas", async () => {
    const factory = fakeIndexedDbFactory();
    const openSpy = vi.spyOn(factory, "open");
    const store = openIndexedWorkspaceStore(factory)!;
    await store.set("a");
    await store.get();
    await store.set("b");
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it("sem IndexedDB disponível (como no jsdom deste teste), devolve nulo em vez de travar", () => {
    expect(openIndexedWorkspaceStore(undefined)).toBeNull();
  });

  it("propaga o erro quando a gravação falha, para quem chama saber que não salvou de verdade", async () => {
    const failingFactory = {
      open() {
        const request = {} as IDBOpenDBRequest;
        queueMicrotask(() => {
          (request as { error: unknown }).error = new Error("indisponível");
          request.onerror?.(new Event("error"));
        });
        return request;
      },
    } as unknown as IDBFactory;
    const store = openIndexedWorkspaceStore(failingFactory)!;
    await expect(store.set("x")).rejects.toThrow("indisponível");
  });
});
