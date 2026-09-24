import { isHandwritingDocument } from "../data/local-workspace.js";
import {
  MAX_NOTEBOOK_COLLAB_PARTICIPANTS,
  NOTEBOOK_COLLAB_TTL_SECONDS,
  addNotebookCollabParticipant,
  applyNotebookCollabDocument,
  createNotebookCollabCode,
  sanitizeNotebookCollabAvatar,
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
import { mergeHandwriting } from "../domain/merge-handwriting.js";
import type { KvStore } from "./kv-store.js";
import { RoomConflict, versionedStore } from "./room-transaction.js";
import { safeEqual } from "./secure-compare.js";

const MAX_REQUEST_BYTES = 900_000;

export type NotebookCollabHandlerDependencies = {
  store: KvStore;
  publish(code: string, state: PublicNotebookCollabState): Promise<void>;
  streamUrl(code: string): string;
  now?(): number;
  randomCode?(): string;
  randomId?(): string;
  guard?(request: Request): Promise<Response | undefined>;
  authenticate?(request: Request): Promise<{ uid: string; name: string } | undefined>;
  identity?: { uid: string; name: string };
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
    const participant = state.participants.find((item) => safeEqual(item.token, credential));
    if (!participant) return jsonResponse(403, { error: "Você não está neste caderno." });
    if (dependencies.identity && participant.accountId !== dependencies.identity.uid)
      return jsonResponse(403, { error: "Entre na conta usada neste convite." });
    return { state, participantId: participant.id };
  }

  return async function handle(request: Request): Promise<Response> {
    const action = new URL(request.url).searchParams.get("action");

    if (action === "view-create") {
      const body = await readJsonBody(request);
      const pages = body["pages"];
      if (
        !Array.isArray(pages) ||
        !pages.length ||
        pages.length > 40 ||
        !pages.every((page: unknown) => {
          if (!page || typeof page !== "object") return false;
          const item = page as Record<string, unknown>;
          return (
            typeof item["title"] === "string" &&
            item["title"].length <= 200 &&
            typeof item["image"] === "string" &&
            /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(item["image"])
          );
        })
      )
        return jsonResponse(400, { error: "Escolha de 1 a 40 folhas com imagens válidas." });
      // A separate, unguessable read capability never exposes room credentials.
      const token = crypto.randomUUID();
      const expiresAt = now() + 7 * 24 * 60 * 60 * 1000;
      await dependencies.store.set(
        `notebook-views/${token}`,
        JSON.stringify({ pages, expiresAt }),
        7 * 24 * 60 * 60,
      );
      return jsonResponse(201, { token, expiresAt });
    }
    if (action === "view-read") {
      const body = await readJsonBody(request);
      const token = body["token"];
      if (typeof token !== "string" || !/^[a-f0-9-]{36}$/.test(token))
        return jsonResponse(404, { error: "Link de visualização inválido ou expirado." });
      const raw = await dependencies.store.get(`notebook-views/${token}`);
      if (!raw) return jsonResponse(404, { error: "Link de visualização inválido ou expirado." });
      const snapshot = JSON.parse(raw) as { expiresAt: number };
      if (snapshot.expiresAt <= now()) return jsonResponse(404, { error: "Este link expirou." });
      return jsonResponse(200, snapshot);
    }

    if (action === "create" && request.method === "POST") {
      const body = await readJsonBody(request);
      const displayName = sanitizeNotebookCollabName(
        dependencies.identity?.name ??
          (typeof body["displayName"] === "string" ? body["displayName"] : ""),
      );
      const notebookId = typeof body["notebookId"] === "string" ? body["notebookId"].trim() : "";
      if (!displayName || !notebookId || notebookId.length > 120)
        return jsonResponse(400, { error: "Nome ou caderno inválido." });
      if (body["document"] !== undefined && !isHandwritingDocument(body["document"]))
        return jsonResponse(400, { error: "A folha compartilhada ficou inválida." });
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
        {
          id: randomId(),
          displayName,
          ...(dependencies.identity ? { accountId: dependencies.identity.uid } : {}),
          ...(sanitizeNotebookCollabAvatar(body["avatarUrl"])
            ? { avatarUrl: sanitizeNotebookCollabAvatar(body["avatarUrl"]) }
            : {}),
          token: hostToken,
          online: true,
          lastSeenAt: now(),
        },
        now(),
      );
      if (requestId) state.createRequestId = requestId;
      if (isHandwritingDocument(body["document"]))
        state.document = body["document"] as HandwritingDocument;
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
        dependencies.identity?.name ??
          (typeof body["displayName"] === "string" ? body["displayName"] : ""),
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
        !dependencies.identity &&
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
          ...(dependencies.identity ? { accountId: dependencies.identity.uid } : {}),
          ...(sanitizeNotebookCollabAvatar(body["avatarUrl"])
            ? { avatarUrl: sanitizeNotebookCollabAvatar(body["avatarUrl"]) }
            : {}),
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
      const body = await readJsonBody(request);
      const authorized = await authorizedParticipant(body);
      if (authorized instanceof Response) return authorized;
      const updated = touchNotebookCollabParticipant(
        authorized.state,
        authorized.participantId,
        now(),
        action !== "leave",
        action === "heartbeat" && dependencies.identity
          ? {
              displayName: sanitizeNotebookCollabName(dependencies.identity.name),
              avatarUrl: sanitizeNotebookCollabAvatar(body["avatarUrl"]),
            }
          : undefined,
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
        document:
          isHandwritingDocument(body["baseDocument"]) && authorized.state.document
            ? mergeHandwriting(
                body["baseDocument"] as HandwritingDocument,
                candidate as HandwritingDocument,
                authorized.state.document,
              )
            : (candidate as HandwritingDocument),
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
      if (text.length > (action === "view-create" ? 4_000_000 : MAX_REQUEST_BYTES * 2))
        return jsonResponse(413, { error: "Pedido muito grande." });
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return jsonResponse(400, { error: "Pedido inválido." });
      const blocked = await dependencies.guard?.(request);
      if (blocked) return blocked;
      const identity =
        action !== "view-read" && action !== "view-create"
          ? await dependencies.authenticate?.(request)
          : undefined;
      if (
        dependencies.authenticate &&
        action !== "view-read" &&
        action !== "view-create" &&
        !identity
      )
        return jsonResponse(401, { error: "Entre na sua conta para editar este caderno." });
      for (let attempt = 0; attempt < 40; attempt += 1) {
        try {
          const result = await createAttempt({
            ...dependencies,
            ...(identity ? { identity } : {}),
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
