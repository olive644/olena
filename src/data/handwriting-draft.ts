import { isHandwritingDocument } from "./local-workspace";
import { PACKED_STORAGE_WRITES, packDocument, unpackDocument } from "./handwriting-pack";
import type { HandwritingDocument } from "../domain/handwriting";

export function encodeHandwritingDraft(document: HandwritingDocument, base?: HandwritingDocument) {
  return JSON.stringify({
    document: PACKED_STORAGE_WRITES ? packDocument(document) : document,
    base: JSON.stringify(base ?? null),
  });
}

// O rascunho é `{ document, base }` ou, nos mais antigos, o próprio documento.
function unpackDocumentIfPacked(value: unknown): unknown {
  if (value && typeof value === "object" && "document" in value && "base" in value) {
    return { ...value, document: unpackDocument((value as { document: unknown }).document) };
  }
  return unpackDocument(value);
}

export function decodeHandwritingDraft(
  raw: string,
  base?: HandwritingDocument,
): HandwritingDocument | null {
  try {
    const value: unknown = unpackDocumentIfPacked(JSON.parse(raw));
    // Old device-only drafts must never overwrite a saved cloud document.
    if (isHandwritingDocument(value)) return base ? null : (value as HandwritingDocument);
    if (!value || typeof value !== "object" || !("document" in value) || !("base" in value))
      return null;
    return value.base === JSON.stringify(base ?? null) && isHandwritingDocument(value.document)
      ? (value.document as HandwritingDocument)
      : null;
  } catch {
    return null;
  }
}
