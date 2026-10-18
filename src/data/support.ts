import { uiText } from "../i18n/runtime.js";
import { getFirebaseAccountServices } from "./firebase-account";
import type { SupportFeed, SupportTicket } from "../domain/support";

function isTicket(value: unknown): value is SupportTicket {
  if (!value || typeof value !== "object") return false;
  const ticket = value as Record<string, unknown>;
  return (
    typeof ticket["id"] === "string" &&
    /^[a-f0-9]{64}$/.test(ticket["id"]) &&
    Number.isFinite(ticket["updatedAt"]) &&
    Array.isArray(ticket["messages"]) &&
    ticket["messages"].length <= 100 &&
    ticket["messages"].every((m: unknown) =>
      Boolean(
        m &&
        typeof m === "object" &&
        "id" in m &&
        typeof m.id === "string" &&
        "text" in m &&
        typeof m.text === "string" &&
        m.text.length <= 2000 &&
        "at" in m &&
        Number.isFinite(m.at) &&
        "from" in m &&
        ["user", "team"].includes(String(m.from)),
      ),
    )
  );
}
export async function requestSupport(
  options: { ticket?: string; inbox?: boolean; text?: string; requestId?: string } = {},
  signal?: AbortSignal,
): Promise<SupportFeed> {
  const { auth } = await getFirebaseAccountServices();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.isAnonymous)
    throw new Error(uiText("Entre na conta para conversar com o time."));
  const token = await user.getIdToken();
  if (auth.currentUser?.uid !== user.uid)
    throw new Error(uiText("A conta mudou. Abra o atendimento novamente."));
  const query = new URLSearchParams({ action: "support" });
  if (options.ticket) query.set("ticket", options.ticket);
  if (options.inbox) query.set("inbox", "1");
  const response = await fetch(`/api/olena?${query}`, {
    method: options.text !== undefined ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.any([AbortSignal.timeout(15000), ...(signal ? [signal] : [])]),
    cache: "no-store",
    ...(options.text !== undefined
      ? { body: JSON.stringify({ text: options.text, requestId: options.requestId }) }
      : {}),
  });
  const body: unknown = await response.json();
  if (auth.currentUser?.uid !== user.uid)
    throw new Error(uiText("A conta mudou. Abra o atendimento novamente."));
  if (!response.ok)
    throw new Error(
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : uiText("Não foi possível conectar ao atendimento."),
    );
  if (
    !body ||
    typeof body !== "object" ||
    !("staff" in body) ||
    typeof body.staff !== "boolean" ||
    ("ticket" in body && !isTicket(body.ticket)) ||
    ("inbox" in body &&
      (!Array.isArray(body.inbox) ||
        body.inbox.length > 50 ||
        !body.inbox.every((item: unknown) =>
          Boolean(
            item &&
            typeof item === "object" &&
            "id" in item &&
            typeof item.id === "string" &&
            /^[a-f0-9]{64}$/.test(item.id) &&
            "updatedAt" in item &&
            Number.isFinite(item.updatedAt),
          ),
        )))
  )
    throw new Error(uiText("Resposta inválida do atendimento."));
  return body as SupportFeed;
}
