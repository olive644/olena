import { expect, it, vi } from "vitest";
import { assertPrivateDiscordLogDestination } from "./discord-account-log-runtime";

function fixture(
  options: {
    publicChannel?: boolean;
    otherViewer?: boolean;
    wrongParent?: boolean;
    noBot?: boolean;
    trustedViewer?: "owner" | "admin-role" | "admin-member";
  } = {},
) {
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/users/@me")) return Response.json({ id: "bot" });
    if (url.endsWith("/guilds/1562664412530085908")) return Response.json({ owner_id: "owner" });
    if (url.endsWith("/roles")) return Response.json([{ id: "admin-role", permissions: "8" }]);
    if (url.includes("/members/")) return Response.json({ roles: ["admin-role"] });
    const category = url.endsWith("/1562664695339417672");
    return Response.json({
      type: category ? 4 : 0,
      guild_id: "1562664412530085908",
      parent_id: options.wrongParent ? "wrong" : "1562664695339417672",
      permission_overwrites: [
        {
          id: "1562664412530085908",
          type: 0,
          deny: options.publicChannel && !category ? "0" : "1024",
          allow: "0",
        },
        ...(!options.noBot ? [{ id: "bot", type: 1, allow: "3072", deny: "0" }] : []),
        ...(options.otherViewer ? [{ id: "member-role", type: 0, allow: "1024", deny: "0" }] : []),
        ...(options.trustedViewer
          ? [
              {
                id: options.trustedViewer,
                type: options.trustedViewer === "admin-role" ? 0 : 1,
                allow: "1024",
                deny: "0",
              },
            ]
          : []),
      ],
    });
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
it("confere categoria e canal privados no servidor correto", async () => {
  const fetcher = fixture();
  await expect(assertPrivateDiscordLogDestination()).resolves.toBeUndefined();
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it.each(["owner", "admin-role", "admin-member"] as const)(
  "aceita acesso administrativo existente: %s",
  async (trustedViewer) => {
    fixture({ trustedViewer });
    await expect(assertPrivateDiscordLogDestination()).resolves.toBeUndefined();
  },
);
it.each([{ publicChannel: true }, { otherViewer: true }, { wrongParent: true }, { noBot: true }])(
  "recusa destino inseguro %j",
  async (options) => {
    fixture(options);
    await expect(assertPrivateDiscordLogDestination()).rejects.toThrow();
  },
);
it("falha fechada quando não consegue conferir permissões", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
  await expect(assertPrivateDiscordLogDestination()).rejects.toThrow();
});
it("não aceita cargo sem Administrator apenas pelo nome", async () => {
  const fetcher = fixture({ trustedViewer: "admin-role" });
  const original = fetcher.getMockImplementation()!;
  fetcher.mockImplementation(async (input) =>
    String(input).endsWith("/roles")
      ? Response.json([{ id: "admin-role", name: "Administrador", permissions: "0" }])
      : original(input),
  );
  await expect(assertPrivateDiscordLogDestination()).rejects.toMatchObject({
    code: "discord-log-extra-viewer",
  });
});
it("bloqueia envio se consulta administrativa falhar", async () => {
  const fetcher = fixture({ trustedViewer: "owner" });
  const original = fetcher.getMockImplementation()!;
  fetcher.mockImplementation(async (input) =>
    String(input).endsWith("/roles") ? new Response(null, { status: 403 }) : original(input),
  );
  await expect(assertPrivateDiscordLogDestination()).rejects.toThrow();
});
