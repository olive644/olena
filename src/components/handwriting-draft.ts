import { isHandwritingDocument } from "../data/local-workspace";
import type { HandwritingDocument } from "../domain/handwriting";

export function readDraft(key: string): HandwritingDocument | null {
  try {
    const raw = localStorage.getItem(`helenastudy.handwriting.draft.${key}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isHandwritingDocument(parsed) ? (parsed as HandwritingDocument) : null;
  } catch {
    return null;
  }
}

export function strokeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}
