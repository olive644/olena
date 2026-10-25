import type { StudyMaterial } from "./workspace";

export function safeMaterialUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function filterMaterials(
  materials: StudyMaterial[],
  options: {
    query: string;
    subject: string;
    kind: string;
    collection: string;
    archived: boolean;
    favorites: boolean;
    sort: string;
  },
) {
  const query = options.query
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
  return materials
    .filter(
      (item) =>
        Boolean(item.archived) === options.archived &&
        (!options.favorites || item.favorite) &&
        (!options.subject || item.subjectId === options.subject) &&
        (!options.kind || item.kind === options.kind) &&
        (!options.collection || item.collectionId === options.collection) &&
        (!query ||
          `${item.title} ${item.content} ${(item["tags"] ?? []).join(" ")}`
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLocaleLowerCase()
            .includes(query)),
    )
    .sort((a, b) =>
      options.sort === "title"
        ? a.title.localeCompare(b.title)
        : (options.sort === "opened" ? (b.openedAt ?? "") : b.createdAt).localeCompare(
            options.sort === "opened" ? (a.openedAt ?? "") : a.createdAt,
          ),
    );
}

export function validLibraryMetadata(value: Record<string, unknown>): boolean {
  return (
    ["collectionId", "openedAt"].every(
      (key) => value[key] === undefined || typeof value[key] === "string",
    ) &&
    ["favorite", "archived"].every(
      (key) => value[key] === undefined || typeof value[key] === "boolean",
    ) &&
    (value["tags"] === undefined ||
      (Array.isArray(value["tags"]) &&
        value["tags"].length <= 30 &&
        value["tags"].every((tag) => typeof tag === "string" && tag.length <= 80))) &&
    (value["page"] === undefined ||
      (Number.isSafeInteger(value["page"]) && Number(value["page"]) > 0)) &&
    (value["scroll"] === undefined ||
      (typeof value["scroll"] === "number" &&
        Number.isFinite(value["scroll"]) &&
        value["scroll"] >= 0)) &&
    (value["bookmarks"] === undefined ||
      (Array.isArray(value["bookmarks"]) &&
        value["bookmarks"].every((page) => Number.isSafeInteger(page) && Number(page) > 0))) &&
    (value["annotations"] === undefined ||
      (Array.isArray(value["annotations"]) &&
        value["annotations"].every((entry: unknown) => {
          if (!entry || typeof entry !== "object") return false;
          const item = entry as Record<string, unknown>;
          return (
            typeof item["id"] === "string" &&
            typeof item["quote"] === "string" &&
            item["quote"].length <= 10000 &&
            typeof item["note"] === "string" &&
            item["note"].length <= 10000 &&
            Number.isSafeInteger(item["page"]) &&
            Number(item["page"]) > 0
          );
        })))
  );
}
