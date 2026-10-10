import {
  OLENA_API_VERSION,
  isOlenaIslandId,
  olenaCatalog,
  olenaIslands,
  olenaMethodologies,
  type OlenaApiError,
  type OlenaErrorCode,
} from "../domain/olena.js";
import { mathResponse } from "./math-handler.js";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Olena-API-Version": String(OLENA_API_VERSION),
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function error(status: number, code: OlenaErrorCode, message: string): Response {
  const body: OlenaApiError = { version: OLENA_API_VERSION, error: { code, message } };
  return json(status, body);
}

/** Catálogo e desafios matemáticos calculados, sem provedor de IA ou escrita no servidor. */
export async function handleOlena(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("action") === "math") {
    if (
      [...url.searchParams.keys()].some((key) => !["action", "version"].includes(key)) ||
      url.searchParams.getAll("action").length !== 1 ||
      url.searchParams.getAll("version").length > 1 ||
      (url.searchParams.has("version") && url.searchParams.get("version") !== "1")
    )
      return error(400, "invalid_request", "Parâmetros inválidos.");
    const result = await mathResponse(request);
    const response = json(result.status, result.body);
    if (result.status === 405) response.headers.set("Allow", "POST");
    return response;
  }
  if (request.method !== "GET") {
    const response = error(405, "method_not_allowed", "Método não permitido.");
    response.headers.set("Allow", "GET");
    return response;
  }
  const parameters = new URL(request.url).searchParams;
  if (
    [...parameters.keys()].some((key) => !["version", "action", "island"].includes(key)) ||
    ["version", "action", "island"].some((key) => parameters.getAll(key).length > 1)
  )
    return error(400, "invalid_request", "Parâmetros inválidos.");
  if (parameters.has("version") && parameters.get("version") !== String(OLENA_API_VERSION))
    return error(400, "unsupported_version", "Versão da API não suportada.");

  const action = parameters.get("action") ?? "catalog";
  if (!["catalog", "islands", "methodologies"].includes(action))
    return error(404, "not_found", "Capacidade não disponível.");
  const island = parameters.get("island");
  if (island !== null && (action !== "methodologies" || !isOlenaIslandId(island)))
    return error(400, "invalid_request", "Ilha ou filtro inválido.");

  if (action === "catalog") return json(200, olenaCatalog());
  if (action === "islands")
    return json(200, { version: OLENA_API_VERSION, islands: olenaIslands() });
  return json(200, {
    version: OLENA_API_VERSION,
    status: "foundation",
    methodologies: olenaMethodologies(isOlenaIslandId(island) ? island : undefined),
  });
}
