import { expect, it, vi } from "vitest";
import { createDiscordAccountTestHandler, DiscordAccountTestError } from "./discord-account-test";

function setup() {
  let identity:
    { uid: string; email?: string; emailVerified: boolean; anonymous: boolean } | undefined = {
    uid: "owner",
    email: "Owner@example.test",
    emailVerified: true,
    anonymous: false,
  };
  let quota = true;
  let enabled = true;
  const send = vi.fn(async () => "1562664759017340999");
  const handler = createDiscordAccountTestHandler({
    ownerEmail: "owner@example.test",
    allowedOrigins: ["https://app.test"],
    identify: async () => identity,
    consume: async () => quota,
    enabled: () => enabled,
    send,
  });
  return {
    send,
    setIdentity: (value: typeof identity) => {
      identity = value;
    },
    disable: () => {
      enabled = false;
    },
    exhaust: () => {
      quota = false;
    },
    call: (method = "POST", body = '{"confirm":true}', origin = "https://app.test") =>
      handler(
        new Request("https://app.test/api/olena?action=account-log-test", {
          method,
          headers: { origin },
          ...(method !== "GET" ? { body } : {}),
        }),
      ),
  };
}
it("somente a identidade verificada da responsável pode testar, nunca um papel do cliente", async () => {
  const s = setup();
  s.setIdentity(undefined);
  expect((await s.call()).status).toBe(401);
  for (const identity of [
    { uid: "other", email: "other@example.test", emailVerified: true, anonymous: false },
    { uid: "owner", email: "owner@example.test", emailVerified: false, anonymous: false },
    { uid: "owner", email: "owner@example.test", emailVerified: true, anonymous: true },
  ]) {
    s.setIdentity(identity);
    expect((await s.call("POST", '{"confirm":true,"creks":true}')).status).toBe(403);
  }
  expect(s.send).not.toHaveBeenCalled();
});
it("GET confere acesso sem enviar mensagem e POST exige confirmação explícita", async () => {
  const s = setup();
  expect((await s.call("GET")).status).toBe(200);
  expect(s.send).not.toHaveBeenCalled();
  for (const body of [
    "{}",
    "null",
    "invalid",
    '{"confirm":false}',
    '{"confirm":true,"content":"fake account"}',
  ])
    expect((await s.call("POST", body)).status).toBe(400);
  expect(s.send).not.toHaveBeenCalled();
});
it("devolve somente o ID confirmado pelo Discord", async () => {
  const s = setup();
  const response = await s.call();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ messageId: "1562664759017340999" });
  expect(s.send).toHaveBeenCalledTimes(1);
});
it("recusa origem externa, método, limite e configuração inativa", async () => {
  const s = setup();
  expect((await s.call("POST", "{}", "https://evil.test")).status).toBe(403);
  expect((await s.call("PUT")).status).toBe(405);
  s.disable();
  expect((await s.call()).status).toBe(503);
  expect(await (await s.call("GET")).json()).toEqual({ enabled: false });
  s.exhaust();
  expect((await s.call()).status).toBe(429);
  expect(s.send).not.toHaveBeenCalled();
});
it("diagnóstico autorizado preserva código/etapa e nunca devolve segredos ou erro bruto", async () => {
  const s = setup();
  s.send.mockRejectedValueOnce(new DiscordAccountTestError("discord-log-public", "channel"));
  expect(await (await s.call()).json()).toEqual({ error: "discord-log-public", target: "channel" });
  s.send.mockRejectedValueOnce(new Error("private-token-do-not-export"));
  const response = await s.call();
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private-token");
});
