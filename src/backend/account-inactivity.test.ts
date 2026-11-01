import { expect, it, vi } from "vitest";
import { createAccountInactivity } from "./account-inactivity";
const ref = "abcdef0123456789";
const WEEK = 7 * 86400000;
function fixture() {
  let now = 2000000000000;
  let version = 0;
  let value: unknown = null;
  const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(_input);
    if (url.includes("orderBy=")) return Response.json(value ? { [ref]: value } : {});
    if (init?.method === "PUT") {
      const headers = new Headers(init.headers);
      if (headers.get("if-match") !== String(version)) return new Response(null, { status: 412 });
      value = JSON.parse(String(init.body));
      version++;
    }
    return Response.json(value, { headers: { etag: String(version) } });
  });
  return {
    tracker: createAccountInactivity(
      "https://db.test",
      async () => "server-token",
      fetcher,
      () => now,
    ),
    advance: (ms: number) => {
      now += ms;
    },
    value: () => value,
    account: {
      uid: "private-uid",
      authTime: now / 1000,
      provider: "google.com",
      deleted: false,
      name: "Pessoa",
    },
    fetcher,
  };
}
it("avisa uma vez após 7 dias, roxo com nome, e volta a permitir após atividade", async () => {
  const s = fixture(),
    send = vi.fn(async () => {});
  await s.tracker.observe(s.account, ref, "Google");
  await s.tracker.sweep(send);
  expect(send).not.toHaveBeenCalled();
  s.advance(WEEK);
  await s.tracker.sweep(send);
  await s.tracker.sweep(send);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Pessoa",
      color: 0x7839ee,
      title: "Sem atividade registrada há 7 dias",
    }),
  );
  await s.tracker.observe(s.account, ref, "Google");
  s.advance(WEEK);
  await s.tracker.sweep(send);
  expect(send).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(s.value())).not.toContain("private-uid");
});
it("exclusão remove acompanhamento e retenção expirada não envia", async () => {
  const s = fixture(),
    send = vi.fn(async () => {});
  await s.tracker.observe(s.account, ref, "Google");
  await s.tracker.observe({ ...s.account, deleted: true }, ref, "Google");
  expect(s.value()).toBeNull();
  await s.tracker.observe(s.account, ref, "Google");
  s.advance(30 * 86400000);
  await s.tracker.sweep(send);
  expect(send).not.toHaveBeenCalled();
  expect(s.value()).toBeNull();
});
it("concorrência e entrega incerta não duplicam aviso", async () => {
  const s = fixture(),
    send = vi.fn(async () => {});
  await s.tracker.observe(s.account, ref, "Google");
  s.advance(WEEK);
  await Promise.all([s.tracker.sweep(send), s.tracker.sweep(send)]);
  expect(send).toHaveBeenCalledTimes(1);
  await s.tracker.observe(s.account, ref, "Google");
  s.advance(WEEK);
  send.mockRejectedValueOnce(new Error("network"));
  await expect(s.tracker.sweep(send)).rejects.toThrow();
  await s.tracker.sweep(send);
  expect(send).toHaveBeenCalledTimes(2);
});
it("consulta do cron é limitada a 50 registros e gravação não recebe UID", async () => {
  const s = fixture();
  await s.tracker.observe(s.account, ref, "Google");
  await s.tracker.sweep(async () => {});
  expect(s.fetcher.mock.calls.some(([url]) => String(url).includes("limitToFirst=50"))).toBe(true);
  expect(JSON.stringify(s.fetcher.mock.calls)).not.toContain("private-uid");
});
