import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSupportHandler, deleteSupportAccount } from "./support-handler";
import type { KvStore } from "./kv-store";

const hash = (uid: string) => createHash("sha256").update(uid).digest("hex");
function setup() {
  const data = new Map<string, string>();
  let version = 0;
  const store: KvStore = {
    get: async (key) => data.get(key),
    set: async (key, value) => {
      data.set(key, value);
      version++;
    },
    del: async (key) => {
      data.delete(key);
      version++;
    },
    readVersion: async (key) => ({ value: data.get(key), version: String(version) }),
    compareAndSet: async (key, value, _ttl, expected) => {
      if (expected !== String(version)) return false;
      data.set(key, value);
      version++;
      return true;
    },
  };
  // Versions are per key in Firebase, including writes to the inbox.
  const versions = new Map<string, number>();
  store.readVersion = async (key) => ({
    value: data.get(key),
    version: String(versions.get(key) ?? 0),
  });
  store.compareAndSet = async (key, value, _ttl, expected) => {
    if (expected !== String(versions.get(key) ?? 0)) return false;
    data.set(key, value);
    versions.set(key, (versions.get(key) ?? 0) + 1);
    return true;
  };
  const handle = createSupportHandler({
    store,
    allowedOrigins: ["https://app.test"],
    staffHashes: [hash("staff")],
    identify: async (request) => {
      const uid = request.headers.get("authorization");
      return uid
        ? { uid, anonymous: uid === "anonymous", emailVerified: uid !== "unverified" }
        : undefined;
    },
    consume: async (uid) => uid !== "limited",
    now: () => 1000000,
  });
  const request = (uid: string, query = "", body?: unknown, origin = "https://app.test") =>
    handle(
      new Request(`https://app.test/api/olena?action=support${query}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { authorization: uid, origin, "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );
  return { request, store, data };
}
describe("private support authorization", () => {
  it("isolates accounts and permits only fixed staff to read the inbox and reply", async () => {
    const { request } = setup();
    expect((await request("alice", "", { text: "Ajuda", requestId: randomUUID() })).status).toBe(
      200,
    );
    expect((await request("bob", `&ticket=${hash("alice")}`)).status).toBe(403);
    expect((await request("alice", "&inbox=1")).status).toBe(403);
    expect((await request("staff", "&inbox=1")).status).toBe(200);
    const reply = await request("staff", `&ticket=${hash("alice")}`, {
      text: "Olá!",
      requestId: randomUUID(),
    });
    expect(reply.status).toBe(200);
    expect((await reply.json()).ticket.messages[1].from).toBe("team");
    expect((await (await request("bob")).json()).ticket).toBeUndefined();
  });
  it("rejects impersonation, invalid identity, cross-origin calls and exhausted quota", async () => {
    const { request } = setup();
    for (const uid of ["", "anonymous", "unverified"])
      expect((await request(uid)).status).toBe(401);
    expect((await request("alice", "", undefined, "https://evil.test")).status).toBe(403);
    expect((await request("limited")).status).toBe(429);
    expect(
      (await request("alice", "", { text: "x", requestId: randomUUID(), from: "team" })).status,
    ).toBe(400);
    expect((await request("alice", "&ticket=../../other")).status).toBe(400);
  });
  it("deduplicates retries and deletes both conversation and inbox reference", async () => {
    const { request, store } = setup();
    const body = { text: "Uma mensagem", requestId: randomUUID() };
    await request("alice", "", body);
    const retry = await request("alice", "", body);
    expect((await retry.json()).ticket.messages).toHaveLength(1);
    await deleteSupportAccount(store, "alice");
    expect((await (await request("alice")).json()).ticket).toBeUndefined();
    expect((await (await request("staff", "&inbox=1")).json()).inbox).toEqual([]);
  });
});
