import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { createProfileSocialHandler, type SocialState } from "./profile-social-handler";
import { createProfileSocialEvents } from "./profile-social-events";
import { createVercelHandler } from "./vercel-adapter";
import { readEventStream } from "../ai/event-stream";
import type { SocialFeed } from "../domain/profile-social";

it("duas identidades de teste: seguir e curtir via HTTP entregam evento antes de qualquer polling", async () => {
  vi.unstubAllGlobals();
  const hash = (uid: string) => createHash("sha256").update(uid).digest("hex");
  let state: SocialState = { accounts: {} };
  let version = 0;
  let origin = "";
  let now = Date.now();
  const activityId = "a".repeat(32);
  const wake = new Map<string, () => void>();
  const identify = async (request: Request) => {
    const uid = request.headers.get("authorization")?.replace("Bearer test-", "");
    return uid === "a" || uid === "b" ? { uid, anonymous: false, emailVerified: true } : undefined;
  };
  const feed = createProfileSocialHandler({
    get allowedOrigins() {
      return [origin];
    },
    identify,
    consume: async () => true,
    now: () => now,
    completedActivities: async () => [{ id: activityId, kind: "focus", value: 25, at: now }],
    handles: async () => ({ [hash("a")]: { username: "alice" }, [hash("b")]: { username: "bob" } }),
    store: {
      read: async () => ({ value: structuredClone(state), version: String(version) }),
      write: async (value, expected) => {
        if (expected !== String(version)) return false;
        const before = state;
        state = structuredClone(value);
        version++;
        for (const uid of ["a", "b"])
          if (
            JSON.stringify(before.accounts[hash(uid)]?.notices) !==
            JSON.stringify(state.accounts[hash(uid)]?.notices)
          )
            wake.get(uid)?.();
        return true;
      },
    },
  });
  const events = createProfileSocialEvents({
    get allowedOrigins() {
      return [origin];
    },
    identify,
    consume: async () => true,
    async *watch(uid, signal) {
      while (!signal.aborted) {
        await new Promise<void>((resolve) => {
          const done = () => {
            signal.removeEventListener("abort", done);
            wake.delete(uid);
            resolve();
          };
          wake.set(uid, done);
          signal.addEventListener("abort", done, { once: true });
        });
        if (!signal.aborted) yield;
      }
    },
  });
  const server = createServer((req, res) => {
    void createVercelHandler("/api/profile-social", (r) =>
      new URL(r.url).searchParams.has("stream") ? events(r) : feed(r),
    )(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server");
  origin = `http://127.0.0.1:${address.port}`;
  const abort = new AbortController();
  let iterator: AsyncGenerator<string> | undefined;
  const call = (uid: string, action?: Record<string, unknown>) =>
    fetch(`${origin}/api/profile-social`, {
      method: action ? "POST" : "GET",
      headers: {
        Origin: origin,
        Authorization: `Bearer test-${uid}`,
        "Content-Type": "application/json",
      },
      ...(action ? { body: JSON.stringify(action) } : {}),
    });
  try {
    const baseline = (await (await call("b")).json()) as SocialFeed;
    expect(baseline.notifications).toEqual([]);
    const response = await fetch(`${origin}/api/profile-social?stream=1`, {
      signal: abort.signal,
      headers: { Origin: origin, Authorization: "Bearer test-b" },
    });
    iterator = readEventStream(response.body!, abort.signal);
    expect((await iterator.next()).value).toContain('"ready"');
    const received = iterator.next();
    await vi.waitFor(() => expect(wake.has("b")).toBe(true));
    expect((await call("a", { action: "follow", username: "bob" })).status).toBe(200);
    expect((await received).value).toContain('"changed"');
    const updated = (await (await call("b")).json()) as SocialFeed;
    expect(updated.notifications[0]?.person.username).toBe("alice");
    expect(updated.notifications[0]?.person.followed).toBe(false);
    expect((await call("b", { action: "follow", username: "alice" })).status).toBe(200);
    expect(((await (await call("b")).json()) as SocialFeed).notifications[0]?.person.followed).toBe(
      true,
    );
    expect((await call("b", { action: "activity-privacy", enabled: true })).status).toBe(200);
    now += 1000;
    expect((await call("b", { action: "publish-activities" })).status).toBe(200);
    expect(((await (await call("a")).json()) as SocialFeed).activities?.[0]?.id).toBe(activityId);
    const liked = iterator.next();
    await vi.waitFor(() => expect(wake.has("b")).toBe(true));
    expect(
      (await call("a", { action: "like-activity", username: "bob", activityId, liked: true }))
        .status,
    ).toBe(200);
    expect((await liked).value).toContain('"changed"');
    const afterLike = (await (await call("b")).json()) as SocialFeed;
    expect(afterLike.notifications.find((notice) => notice.kind === "like")?.person.username).toBe(
      "alice",
    );
    expect(afterLike.activities?.[0]?.likes).toEqual([{ username: "alice", name: "alice" }]);
  } finally {
    abort.abort();
    await iterator?.return(undefined).catch(() => {});
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
