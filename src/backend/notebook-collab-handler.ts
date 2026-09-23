import { isHandwritingDocument } from "../data/local-workspace.js";
import {
  MAX_NOTEBOOK_COLLAB_PARTICIPANTS,
  NOTEBOOK_COLLAB_TTL_SECONDS,
  addNotebookCollabParticipant,
  applyNotebookCollabDocument,
  createNotebookCollabCode,
  createNotebookCollabState,
  isValidNotebookCollabCode,
  notebookCollabStorageKey,
  normalizeNotebookCollabCode,
  sanitizeNotebookCollabName,
  toPublicNotebookCollabState,
  touchNotebookCollabParticipant,
  type NotebookCollabState,
  type PublicNotebookCollabState,
} from "../domain/notebook-collab.js";
import type { HandwritingDocument } from "../domain/handwriting.js";
import type { KvStore } from "./kv-store.js";
import { RoomConflict, versionedStore } from "./room-transaction.js";

const MAX_REQUEST_BYTES = 900_000;

export type NotebookCollabHandlerDependencies = {
  store: KvStore;
  publish(code: string, state: PublicNotebookCollabState): Promise<void>;
  streamUrl(code: string): string;
  now?(): number;
  randomCode?(): string;
  randomId?(): string;
  guard?(request: Request): Promise<Response | undefined>;
  observe?(event: { action: string; status: number; durationMs: number }): void;
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function loadState(store: KvStore, code: string): Promise<NotebookCollabState | undefined> {
  const raw = await store.get(notebookCollabStorageKey(code));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as NotebookCollabState;
  } catch {
    return undefined;
  }
}

function createAttempt(dependencies: NotebookCollabHandlerDependencies) {
  const now = () => dependencies.now?.() ?? Date.now();
  const randomId = () => dependencies.randomId?.() ?? crypto.randomUUID();
  const randomCode = () => dependencies.randomCode?.() ?? createNotebookCollabCode();

  async function save(state: NotebookCollabState): Promise<PublicNotebookCollabState> {
    const next = {
      ...state,
      revision: state.revision + 1,
      updatedAt: now(),
      expiresAt: now() + NOTEBOOK_COLLAB_TTL_SECONDS * 1000,
    };
    await dependencies.store.set(
      notebookCollabStorageKey(next.code),
      JSON.stringify(next),
      NOTEBOOK_COLLAB_TTL_SECONDS,
    );
    const publicState = toPublicNotebookCollabState(next);
    await dependencies.publish(next.code, publicState);
    return publicState;
  }

  async function authorizedParticipant(
    body: Record<string, unknown>,
  ): Promise<{ state: NotebookCollabState; participantId: string } | Response> {
    const code = typeof body["code"] === "string" ? normalizeNotebookCollabCode(body["code"]) : "";
    const credential = typeof body["credential"] === "string" ? body["credential"] : "";
    if (!isValidNotebookCollabCode(code) || !credential)
      return jsonResponse(400, { error: "Código ou credencial inválidos." });
    const state = await loadState(dependencies.store, code);
    if (!state) return jsonResponse(404, { error: "Caderno compartilhado não encontrado." });
    const participant = state.participants.find((item) => item.token === credential);
    if (!participant) return jsonResponse(403, { error: "Você não está neste caderno." });
    return { state, participantId: participant.id };
  }

  return async function handle(request: Request): Promise<Response> {
    const action = new URL(request.url).searchParams.get("action");

    if (action === "create" && request.method === "POST") {
      const body = await readJsonBody(request);
      const displayName = sanitizeNotebookCollabName(
        typeof body["displayName"] === "string" ? body["displayName"] : "",
      );
      const notebookId = typeof body["notebookId"] === "string" ? body["notebookId"].trim() : "";
      if (!displayName || !notebookId || notebookId.length > 120)
        return jsonResponse(400, { error: "Nome ou caderno inválido." });
      const requestId = typeof body["requestId"] === "string" ? body["requestId"] : "";
      let code = randomCode();
      for (
        let attempt = 0;
        attempt < 20 && (await loadState(dependencies.store, code));
        attempt += 1
      )
        code = randomCode();
      if (await loadState(dependencies.store, code))
        return jsonResponse(503, { error: "Não foi possível abrir uma sala agora." });
      const hostToken = randomId();
      let state = createNotebookCollabState({ code, hostToken, notebookId, now: now() });
      state = addNotebookCollabParticipant(
        state,
        { id: randomId(), displayName, token: hostToken, online: true, lastSeenAt: now() },
        now(),
      );
      if (requestId) state.createRequestId = requestId;
      const publicState = await save(state);
      const host = state.participants[0];
      return jsonResponse(201, {
        code,
        hostToken,
        participantId: host?.id,
        state: publicState,
        streamUrl: dependencies.streamUrl(code),
      });
    }

    if (action === "join" && request.method === "POST") {
      const body = await readJsonBody(request);
      const code =
        typeof body["code"] === "string" ? normalizeNotebookCollabCode(body["code"]) : "";
      const displayName = sanitizeNotebookCollabName(
        typeof body["displayName"] === "string" ? body["displayName"] : "",
      );
      if (!isValidNotebookCollabCode(code) || !displayName)
        return jsonResponse(400, { error: "Código ou nome inválidos." });
      const state = await loadState(dependencies.store, code);
      if (!state) return jsonResponse(404, { error: "Caderno compartilhado não encontrado." });
      const requestId = typeof body["requestId"] === "string" ? body["requestId"] : "";
      const receipt = requestId ? state.receipts?.[`join:${requestId}`] : undefined;
      if (receipt) {
        const participant = state.participants.find((item) => item.id === receipt.participantId);
        return jsonResponse(200, {
          participantId: receipt.participantId,
          participantToken: receipt.participantToken,
          state: toPublicNotebookCollabState(state),
          streamUrl: dependencies.streamUrl(code),
          ...(participant ? { displayName: participant.displayName } : {}),
        });
      }
      if (
        state.participants.filter((item) => item.online !== false).length >=
        MAX_NOTEBOOK_COLLAB_PARTICIPANTS
      )
        return jsonResponse(409, { error: "Este caderno já tem quatro participantes." });
      if (
        state.participants.some(
          (item) => item.displayName.toLowerCase() === displayName.toLowerCase(),
        )
      )
        return jsonResponse(409, { error: "Esse nome já está em uso neste caderno." });
      const participantId = randomId();
      const participantToken = randomId();
      const updated = addNotebookCollabParticipant(
        state,
        {
          id: participantId,
          displayName,
          token: participantToken,
          online: true,
          lastSeenAt: now(),
        },
        now(),
      );
      if (requestId)
        updated.receipts = {
          ...updated.receipts,
          [`join:${requestId}`]: { participantId, participantToken },
        };
      const publicState = await save(updated);
      return jsonResponse(200, {
        participantId,
        participantToken,
        state: publicState,
        streamUrl: dependencies.streamUrl(code),
      });
    }

    if (action === "resume" && request.method === "POST") {
      const authorized = await authorizedParticipant(await readJsonBody(request));
      if (authorized instanceof Response) return authorized;
      const updated = touchNotebookCollabParticipant(
        authorized.state,
        authorized.participantId,
        now(),
        true,
      );
      const publicState = await save(updated);
      return jsonResponse(200, {
        participantId: authorized.participantId,
        state: publicState,
        streamUrl: dependencies.streamUrl(updated.code),
      });
    }

    if (["heartbeat", "leave"].includes(action ?? "") && request.method === "POST") {
      const authorized = await authorizedParticipant(await readJsonBody(request));
      if (authorized instanceof Response) return authorized;
      const updated = touchNotebookCollabParticipant(
        authorized.state,
        authorized.participantId,
        now(),
        action !== "leave",
      );
      const publicState = await save(updated);
      return jsonResponse(200, {
        state: publicState,
        streamUrl: dependencies.streamUrl(updated.code),
      });
    }

    if (action === "update" && request.method === "POST") {
      const body = await readJsonBody(request);
      const authorized = await authorizedParticipant(body);
      if (authorized instanceof Response) return authorized;
      const candidate = body["document"];
      if (!isHandwritingDocument(candidate))
        return jsonResponse(400, { error: "A folha compartilhada ficou inválida." });
      const updated = applyNotebookCollabDocument(authorized.state, {
        participantId: authorized.participantId,
        document: candidate as HandwritingDocument,
        ...(typeof body["label"] === "string" ? { label: body["label"] } : {}),
        now: now(),
      });
      const publicState = await save(updated);
      return jsonResponse(200, { state: publicState });
    }

    return jsonResponse(404, { error: "Ação desconhecida." });
  };
}

export function createNotebookCollabHandler(dependencies: NotebookCollabHandlerDependencies) {
  return async (request: Request): Promise<Response> => {
    const started = Date.now();
    const action = new URL(request.url).searchParams.get("action") ?? "unknown";
    try {
      if (request.method !== "POST") return jsonResponse(405, { error: "Método inválido." });
      if (
        request.headers.get("origin") &&
        request.headers.get("origin") !== new URL(request.url).origin
      )
        return jsonResponse(403, { error: "Origem não permitida." });
      const text = await request.text();
      if (text.length > MAX_REQUEST_BYTES)
        return jsonResponse(413, { error: "Pedido muito grande." });
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return jsonResponse(400, { error: "Pedido inválido." });
      const blocked = await dependencies.guard?.(request);
      if (blocked) return blocked;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        try {
          const result = await createAttempt({
            ...dependencies,
            store: versionedStore(dependencies.store),
          })(new Request(request.url, { method: "POST", headers: request.headers, body: text }));
          dependencies.observe?.({
            action,
            status: result.status,
            durationMs: Date.now() - started,
          });
          return result;
        } catch (error) {
          if (!(error instanceof RoomConflict)) throw error;
        }
      }
      return jsonResponse(503, { error: "Caderno ocupado. Tente novamente." });
    } catch (error) {
      dependencies.observe?.({ action, status: 503, durationMs: Date.now() - started });
      return jsonResponse(error instanceof SyntaxError ? 400 : 503, {
        error:
          error instanceof SyntaxError ? "Pedido inválido." : "A conexão falhou. Tente novamente.",
      });
    }
  };
}
