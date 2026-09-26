import type { StudyNote, StudyNotebook, WorkspaceState } from "./workspace";

// Busca nos cadernos: títulos, texto das folhas, texto digitado sobre a folha manuscrita e
// post-its (com as listas). A escrita à mão em si não entra, porque é imagem: só o que foi
// digitado é pesquisável. Tudo acontece no aparelho.

export type SearchSource = "caderno" | "folha" | "texto" | "post-it" | "lista" | "anexo";

export type SearchHit = {
  id: string;
  notebookId: string;
  notebookTitle: string;
  // Null quando o resultado é o próprio caderno.
  pageId: string | null;
  pageTitle: string;
  source: SearchSource;
  before: string;
  match: string;
  after: string;
};

export const MIN_QUERY_LENGTH = 2;
export const MAX_HITS = 40;
const CONTEXT = 32;

// Sem acento e sem diferença de maiúsculas, mantendo o tamanho: cada letra vira uma letra.
export function fold(value: string): string {
  return Array.from(value)
    .map((char) => {
      const base = char.normalize("NFD").replace(/[̀-ͯ]/g, "");
      return (base.length === 1 ? base : char).toLowerCase();
    })
    .join("");
}

function snippet(text: string, query: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  const at = fold(flat).indexOf(query);
  if (at < 0) return null;
  const start = Math.max(0, at - CONTEXT);
  const end = Math.min(flat.length, at + query.length + CONTEXT);
  return {
    before: (start > 0 ? "…" : "") + flat.slice(start, at),
    match: flat.slice(at, at + query.length),
    after: flat.slice(at + query.length, end) + (end < flat.length ? "…" : ""),
  };
}

function pageTexts(page: StudyNote): { source: SearchSource; text: string }[] {
  const texts: { source: SearchSource; text: string }[] = [];
  if (page.content) texts.push({ source: "texto", text: page.content });
  for (const asset of page.assets) {
    texts.push({ source: "anexo", text: asset.name });
    const document = asset.handwriting;
    if (!document) continue;
    if (document.pageText) texts.push({ source: "texto", text: document.pageText });
    for (const sticky of document.stickies ?? []) {
      if (sticky.text) texts.push({ source: "post-it", text: sticky.text });
      for (const item of sticky.checklist ?? []) {
        if (item.text) texts.push({ source: "lista", text: item.text });
      }
    }
  }
  return texts;
}

export function searchNotebooks(
  workspace: Pick<WorkspaceState, "notebooks" | "notes">,
  rawQuery: string,
): SearchHit[] {
  const query = fold(rawQuery.replace(/\s+/g, " ").trim());
  if (Array.from(query).length < MIN_QUERY_LENGTH) return [];
  const notesById = new Map(workspace.notes.map((note) => [note.id, note]));
  const hits: SearchHit[] = [];
  const push = (
    notebook: StudyNotebook,
    page: StudyNote | null,
    source: SearchSource,
    text: string,
  ) => {
    const found = snippet(text, query);
    if (!found) return;
    hits.push({
      id: `${notebook.id}:${page?.id ?? "-"}:${source}:${hits.length}`,
      notebookId: notebook.id,
      notebookTitle: notebook.title,
      pageId: page?.id ?? null,
      pageTitle: page?.title ?? "",
      source,
      ...found,
    });
  };
  for (const notebook of workspace.notebooks) {
    push(notebook, null, "caderno", notebook.title);
    for (const pageId of notebook.pageIds) {
      const page = notesById.get(pageId);
      if (!page) continue;
      push(notebook, page, "folha", page.title);
      for (const { source, text } of pageTexts(page)) push(notebook, page, source, text);
    }
  }
  return hits.slice(0, MAX_HITS);
}
