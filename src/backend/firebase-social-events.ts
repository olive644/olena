import { createHash } from "node:crypto";
import { readEventStream } from "../ai/event-stream.js";

export function createFirebaseSocialWatcher(options: {
  databaseUrl: string;
  token(): Promise<string>;
  fetcher?: typeof fetch;
}) {
  return async function* watch(uid: string, signal: AbortSignal): AsyncGenerator<void> {
    const key = createHash("sha256").update(uid).digest("hex");
    const original = new URL(
      `${options.databaseUrl.replace(/\/+$/, "")}/privateProfileSocial/accounts/${key}/notices.json`,
    );
    let url = original;
    const token = await options.token();
    const fetcher = options.fetcher ?? fetch;
    let response: Response | undefined;
    // Fetch remove Authorization em redirects para outro host. Só seguir shards oficiais,
    // preservando namespace e caminho da conta, sem colocar a credencial na URL.
    for (let redirects = 0; redirects < 3; redirects++) {
      response = await fetcher(url, {
        signal,
        redirect: "manual",
        headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      });
      if (response.status !== 307) break;
      await response.body?.cancel();
      const next = new URL(response.headers.get("location") ?? "", url);
      if (
        next.protocol !== "https:" ||
        next.port ||
        next.username ||
        next.password ||
        !/\.(firebaseio\.com|firebasedatabase\.app)$/.test(next.hostname) ||
        next.pathname !== original.pathname ||
        next.searchParams.get("ns") !== original.hostname.split(".")[0]
      )
        throw new Error("social-redirect");
      url = next;
    }
    if (
      !response?.ok ||
      !response.body ||
      !response.headers.get("content-type")?.includes("text/event-stream")
    ) {
      await response?.body?.cancel();
      throw new Error("social-stream");
    }
    let previous = "";
    let events = 0;
    for await (const data of readEventStream(response.body, signal)) {
      const value: unknown = JSON.parse(data);
      if (value === null) continue;
      if (
        !value ||
        typeof value !== "object" ||
        !("path" in value) ||
        typeof value.path !== "string" ||
        !("data" in value)
      )
        throw new Error("social-event");
      const signature = JSON.stringify(value);
      if (signature === previous) continue;
      previous = signature;
      if (++events > 256) return;
      yield;
    }
  };
}
