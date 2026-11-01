import { expect, it, vi } from "vitest";
import { assertPrivateDiscordLogDestination } from "./discord-account-log-runtime";

function fixture(
  options: {
    publicChannel?: boolean;
    otherViewer?: boolean;
    wrongParent?: boolean;
    noBot?: boolean;
  } = {},
) {
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/users/@me")) return Response.json({ id: "bot" });
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
