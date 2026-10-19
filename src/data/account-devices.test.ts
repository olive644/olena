import { expect, it, vi } from "vitest";
import { accountDeviceId, requestAccountDevices } from "./account-devices";
import { getFirebaseAccountServices } from "./firebase-account";
vi.mock("./firebase-account", () => ({ getFirebaseAccountServices: vi.fn() }));
it("mantém o identificador no navegador sem compartilhá-lo entre contas", () => {
  localStorage.clear();
  const first = accountDeviceId("a");
  expect(accountDeviceId("a")).toBe(first);
  expect(accountDeviceId("b")).not.toBe(first);
});
it("não consulta dispositivos sem uma conta real", async () => {
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { authStateReady: async () => {}, currentUser: null },
  } as unknown as Awaited<ReturnType<typeof getFirebaseAccountServices>>);
  const fetch = vi.spyOn(globalThis, "fetch");
  await expect(requestAccountDevices()).rejects.toThrow("auth");
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});
