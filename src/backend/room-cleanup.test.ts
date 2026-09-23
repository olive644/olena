import { it, expect, vi } from "vitest";
import { cleanExpiredRooms } from "./room-cleanup";

it("remove projeções vencidas sem apagar uma sala renovada", async () => {
  const fetchImpl = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ OLD: {}, NEW: {} }))
    .mockResolvedValueOnce(Response.json({ expiresAt: 10 }, { headers: { etag: '"old"' } }))
    .mockResolvedValueOnce(new Response(null, { status: 200 }))
    .mockResolvedValueOnce(Response.json({ expiresAt: 300 }))
    .mockResolvedValueOnce(Response.json({ OLD: {} }))
    .mockResolvedValueOnce(Response.json({ expiresAt: 10 }, { headers: { etag: '"race"' } }))
    .mockResolvedValueOnce(new Response(null, { status: 412 }))
    .mockResolvedValueOnce(Response.json(null))
    .mockResolvedValueOnce(Response.json(null))
    .mockResolvedValueOnce(Response.json(null));
  expect(await cleanExpiredRooms("https://db.example", "token", fetchImpl, 100)).toEqual({
    removed: 1,
    pendingPaths: ["private-rooms"],
  });
  expect(fetchImpl.mock.calls[2]![1]).toMatchObject({
    method: "DELETE",
    headers: { "if-match": '"old"' },
  });
  expect(fetchImpl.mock.calls.filter((call) => call[1]?.method === "DELETE")).toHaveLength(2);
});

it("continua após um lote cheio e informa o limite de trabalho", async () => {
  const entries = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`OLD${i}`, {}]));
  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("?")) return Response.json(url.includes("/rooms.json") ? entries : null);
    if (init?.method === "DELETE") return new Response(null, { status: 200 });
    return Response.json({ expiresAt: 10 }, { headers: { etag: '"old"' } });
  });
  expect(await cleanExpiredRooms("https://db.example", "token", fetchImpl, 100, 2)).toEqual({
    removed: 200,
    pendingPaths: ["rooms"],
  });
  expect(fetchImpl.mock.calls.filter(([url]) => String(url).includes("/rooms.json?"))).toHaveLength(
    2,
  );
});
