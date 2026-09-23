import { decodeHandwritingDraft } from "../data/handwriting-draft";
import type { HandwritingDocument } from "../domain/handwriting";

export function readDraft(key: string, base?: HandwritingDocument): HandwritingDocument | null {
  try {
    const raw = localStorage.getItem(`helenastudy.handwriting.draft.${key}`);
    if (!raw) return null;
    return decodeHandwritingDraft(raw, base);
  } catch {
    return null;
  }
}

export function strokeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}
