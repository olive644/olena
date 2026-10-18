import { getFirebaseAccountServices } from "./firebase-account";
import { readEventStream } from "../ai/event-stream";
import { SOCIAL_CHANGED } from "./profile-social";

let connection:
  | {
      uid: string;
      users: Set<symbol>;
      abort: AbortController;
      disconnect?: ReturnType<typeof setTimeout>;
    }
  | undefined;

// Uma conexão por conta/aba, compartilhada por sino e perfil. Token só no cabeçalho.
export function subscribeSocialUpdates(uid: string) {
  if (connection && connection.uid !== uid) {
    connection.abort.abort();
    connection = undefined;
  }
  const user = Symbol();
  if (!connection) {
    const abort = new AbortController();
    connection = { uid, users: new Set(), abort };
    void (async () => {
      let failures = 0;
      while (!abort.signal.aborted) {
        let delay = 2000;
        try {
          const { auth } = await getFirebaseAccountServices();
          await auth.authStateReady();
          const account = auth.currentUser;
          if (!account || account.isAnonymous || account.uid !== uid) return;
          const token = await account.getIdToken();
          if (abort.signal.aborted || auth.currentUser?.uid !== uid) return;
          const response = await fetch("/api/profile-social?stream=1", {
            headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
            signal: abort.signal,
            cache: "no-store",
          });
          if (
            !response.ok ||
            !response.body ||
            !response.headers.get("content-type")?.includes("text/event-stream")
          ) {
            await response.body?.cancel();
            if ([401, 403, 429].includes(response.status)) delay = 60000;
            throw new Error("social-events");
          }
          for await (const data of readEventStream(response.body, abort.signal)) {
            if (auth.currentUser?.uid !== uid || abort.signal.aborted) return;
            const event: unknown = JSON.parse(data);
            if (
              !event ||
              typeof event !== "object" ||
              !("type" in event) ||
              !["ready", "changed"].includes(String(event.type))
            )
              throw new Error("social-event");
            if (event.type === "changed") {
              failures = 0;
              console.info("[Olena] Atualização social recebida pelo canal em tempo real.");
              window.dispatchEvent(new Event(SOCIAL_CHANGED));
            }
          }
        } catch {
          delay = Math.max(delay, Math.min(30000, 2000 * 2 ** Math.min(++failures, 4)));
        }
        if (abort.signal.aborted) return;
        await new Promise<void>((resolve) => {
          const done = () => {
            clearTimeout(timer);
            abort.signal.removeEventListener("abort", done);
            resolve();
          };
          const timer = setTimeout(done, delay);
          abort.signal.addEventListener("abort", done, { once: true });
        });
      }
    })();
  }
  const active = connection;
  clearTimeout(active.disconnect);
  active.users.add(user);
  let released = false;
  return (immediate = false) => {
    if (released) return;
    released = true;
    active.users.delete(user);
    if (!active.users.size) {
      const close = () => {
        if (active.users.size) return;
        active.abort.abort();
        if (connection === active) connection = undefined;
      };
      if (immediate) close();
      else active.disconnect = setTimeout(close, 1000);
    }
  };
}
