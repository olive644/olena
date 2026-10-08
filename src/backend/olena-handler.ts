import {
  OLENA_API_VERSION,
  isOlenaIslandId,
  olenaCatalog,
  olenaIslands,
  olenaMethodologies,
  type OlenaApiError,
  type OlenaErrorCode,
} from "../domain/olena.js";

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

/** API pública de catálogo, sem dados pessoais, escrita, provedor ou geração simulada. */
export async function handleOlena(request: Request): Promise<Response> {
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
