import { expect, it, vi } from "vitest";
import { createAccountLogHandler, type LogAccount } from "./discord-account-log";
import { PRIVACY_POLICY_VERSION } from "../domain/privacy-policy";

function setup() {
  const data = new Map<string, string>();
  const send = vi.fn(async () => {});
  const now = Date.now();
  let account: LogAccount | undefined = {
    uid: "private-uid",
    authTime: Math.floor(now / 1000),
    provider: "google.com",
    createdAt: now,
    deleted: false,
  };
  let quota = true;
  const handler = createAccountLogHandler({
    secret: "test-only-log-key",
    now: () => now,
    allowedOrigins: ["https://app.test"],
    send,
    identify: async () => account,
    consume: async () => quota,
    store: {
      get: async (key) => data.get(key),
      set: async (key, value) => {
        data.set(key, value);
      },
      del: async (key) => {
        data.delete(key);
      },
      readVersion: async (key) => ({ value: data.get(key), version: data.get(key) ?? "" }),
      compareAndSet: async (key, value, _ttl, version) => {
        if ((data.get(key) ?? "") !== version) return false;
        data.set(key, value);
        return true;
      },
    },
  });
  return {
    send,
    setAccount: (value: LogAccount | undefined) => {
      account = value;
    },
    noQuota: () => {
      quota = false;
    },
    call: (event = "login", consent = PRIVACY_POLICY_VERSION, origin = "https://app.test") =>
      handler(
        new Request("https://app.test/api/olena?action=account-log", {
          method: "POST",
          headers: { origin },
          body: JSON.stringify({ event, consent, uid: "forged-user", provider: "password" }),
        }),
      ),
    now,
  };
}
it("deriva conta e método do servidor, sem exportar UID ou campos forjados", async () => {
  const s = setup();
  expect((await s.call()).status).toBe(204);
  expect(s.send).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Conta criada", method: "Google" }),
  );
  expect(JSON.stringify(s.send.mock.calls)).not.toContain("private-uid");
  expect(JSON.stringify(s.send.mock.calls)).not.toContain("forged-user");
});
it("repetição e concorrência da mesma sessão não duplicam o evento", async () => {
  const s = setup();
  await Promise.all([s.call(), s.call(), s.call()]);
  expect(s.send).toHaveBeenCalledTimes(1);
});
it("recusa origem, aceite antigo, identidade ausente, cota e tipo desconhecido", async () => {
  const s = setup();
  expect((await s.call("login", PRIVACY_POLICY_VERSION, "https://evil.test")).status).toBe(403);
  expect((await s.call("login", "old")).status).toBe(400);
  expect((await s.call("created")).status).toBe(400);
  s.setAccount(undefined);
  expect((await s.call()).status).toBe(401);
  s.noQuota();
  expect((await s.call()).status).toBe(429);
  expect(s.send).not.toHaveBeenCalled();
});
it("exclusão exige conta comprovadamente ausente e saída não se apresenta como revogação", async () => {
  const s = setup();
  expect((await s.call("deleted")).status).toBe(401);
  await s.call("logout");
  expect(s.send).toHaveBeenLastCalledWith(
    expect.objectContaining({ title: "Saída informada pelo aplicativo" }),
  );
  s.setAccount({ uid: "u", authTime: s.now / 1000, provider: "password", deleted: true });
  await s.call("deleted");
  expect(s.send).toHaveBeenLastCalledWith(
    expect.objectContaining({ title: "Conta excluída", method: "E-mail e senha" }),
  );
});
it("falha de envio não vira sucesso e permite tentar novamente", async () => {
  const s = setup();
  s.send.mockRejectedValueOnce(new Error("offline"));
  expect((await s.call()).status).toBe(503);
  expect((await s.call()).status).toBe(204);
});
it("recusa login antigo ou método não suportado", async () => {
  const s = setup();
  s.setAccount({ uid: "u", authTime: s.now / 1000 - 901, provider: "google.com", deleted: false });
  expect((await s.call()).status).toBe(401);
  s.setAccount({ uid: "u", authTime: s.now / 1000, provider: "anonymous", deleted: false });
  expect((await s.call()).status).toBe(401);
});
