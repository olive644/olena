import { PRACTICE_ISLANDS } from "../data/practice-islands.js";

export const OLENA_API_VERSION = 1;
export const OLENA_API_ENDPOINT = "/api/olena";
export type OlenaIslandId = (typeof PRACTICE_ISLANDS)[number]["id"];

export type OlenaMethodology = {
  id: string;
  title: string;
  description: string;
  islandIds: readonly OlenaIslandId[];
};

// As metodologias serão adicionadas em uma etapa própria, com conteúdo e validação.
const methodologies: readonly OlenaMethodology[] = [];

export function olenaIslands() {
  return PRACTICE_ISLANDS.map((island) => ({
    id: island.id,
    title: island.title,
    subject: island.subject,
    description: island.description,
    topics: [...island.topics],
    trail: island.id === "languages" ? ("available" as const) : ("planned" as const),
  }));
}

export type OlenaIsland = ReturnType<typeof olenaIslands>[number];

export function isOlenaIslandId(value: unknown): value is OlenaIslandId {
  return PRACTICE_ISLANDS.some((island) => island.id === value);
}

export function olenaMethodologies(island?: OlenaIslandId): readonly OlenaMethodology[] {
  return methodologies.filter((methodology) => !island || methodology.islandIds.includes(island));
}

export function olenaCatalog() {
  return {
    version: OLENA_API_VERSION,
    service: "olena",
    capabilities: {
      catalog: "available",
      methodologies: "foundation",
      textGeneration: "not_configured",
      voice: "not_supported",
    },
    islands: olenaIslands(),
    methodologies: olenaMethodologies(),
  } as const;
}

export type OlenaCatalog = ReturnType<typeof olenaCatalog>;
export type OlenaErrorCode =
  "invalid_request" | "unsupported_version" | "not_found" | "method_not_allowed";
export type OlenaApiError = {
  version: typeof OLENA_API_VERSION;
  error: { code: OlenaErrorCode; message: string };
};
