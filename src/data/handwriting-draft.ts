import { isHandwritingDocument } from "./local-workspace";
import type { HandwritingDocument } from "../domain/handwriting";

export function encodeHandwritingDraft(document: HandwritingDocument, base?: HandwritingDocument) {
  return JSON.stringify({ document, base: JSON.stringify(base ?? null) });
}

export function decodeHandwritingDraft(
  raw: string,
  base?: HandwritingDocument,
): HandwritingDocument | null {
  try {
    const value: unknown = JSON.parse(raw);
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
