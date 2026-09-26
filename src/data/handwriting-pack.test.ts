import { describe, expect, it } from "vitest";
import { createInitialWorkspace, type WorkspaceState } from "../domain/workspace";
import type { HandwritingDocument, HandwritingPoint } from "../domain/handwriting";
import {
  PACKED_STORAGE_WRITES,
  packDocument,
  packPoints,
  packWorkspace,
  unpackDocument,
  unpackPoints,
  unpackWorkspace,
} from "./handwriting-pack";
import { decodeHandwritingDraft, encodeHandwritingDraft } from "./handwriting-draft";
import { loadWorkspace, saveWorkspace, WORKSPACE_STORAGE_KEY } from "./local-workspace";
import {
  WORKSPACE_HISTORY_KEY,
  loadWorkspaceHistory,
  recordWorkspaceSnapshot,
} from "./workspace-history";

function points(count: number, tilt = false): HandwritingPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    x: Math.round((100 + index * 3.1415) * 100) / 100,
    y: Math.round((200 + Math.sin(index / 4) * 40) * 100) / 100,
    pressure: Math.round((0.4 + (index % 10) * 0.031) * 1000) / 1000,
    ...(tilt && index % 3 === 0 ? { tiltX: 12, tiltY: -7 } : {}),
  }));
}

function documentWith(strokes: number, pointsPerStroke: number, tilt = false): HandwritingDocument {
  return {
    version: 1,
    paper: "ruled",
    strokes: Array.from({ length: strokes }, (_, index) => ({
      id: `s-${index}`,
      tool: "pen" as const,
      brush: "fine" as const,
      color: "#17151c",
      width: 4,
      points: points(pointsPerStroke, tilt),
    })),
    stickies: [],
  } as unknown as HandwritingDocument;
}

function workspaceWith(document: HandwritingDocument): WorkspaceState {
  const workspace = createInitialWorkspace();
  workspace.notes.push({
    id: "n1",
    title: "Folha",
    content: "",
    subjectId: "",
    updatedAt: "2026",
    assets: [
      {
        id: "a1",
        kind: "drawing",
        name: "Folha",
        dataUrl: "data:image/png;base64,AA",
        createdAt: "2026",
        handwriting: document,
      },
    ],
  });
  return workspace;
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe("formato compacto dos traços", () => {
  it("empacota e desempacota pontos sem perder nada, com e sem inclinação", () => {
    for (const tilt of [false, true]) {
      const original = points(50, tilt);
      const packed = packPoints(original);
      expect(packed.pts).toHaveLength(150);
      expect(unpackPoints(packed.pts, packed.tilt)).toEqual(original);
    }
    expect(packPoints(points(5)).tilt).toBeUndefined();
  });

  it("um documento vai e volta idêntico", () => {
    const document = documentWith(20, 30, true);
    const packed = packDocument(document) as { strokes: { pts?: number[]; points?: unknown }[] };
    expect(packed.strokes[0]!.points).toBeUndefined();
    expect(packed.strokes[0]!.pts).toBeDefined();
    expect(unpackDocument(JSON.parse(JSON.stringify(packed)))).toEqual(document);
  });

  it("ler o formato antigo não muda nada", () => {
    const document = documentWith(5, 10);
    expect(unpackDocument(document)).toEqual(document);
    const workspace = workspaceWith(document);
    expect(unpackWorkspace(workspace)).toEqual(workspace);
  });

  it("reduz o JSON de uma folha cheia a pouco mais da metade", () => {
    const workspace = workspaceWith(documentWith(300, 40));
    const before = JSON.stringify(workspace).length;
    const after = JSON.stringify(packWorkspace(workspace)).length;
    expect(after).toBeLessThan(before * 0.55);
  });
});

describe("implantação em duas etapas", () => {
  it("por enquanto continua gravando o formato antigo, para versões anteriores abertas ainda lerem", () => {
    expect(PACKED_STORAGE_WRITES).toBe(false);
    const workspace = workspaceWith(documentWith(3, 10));
    const storage = memoryStorage();
    saveWorkspace(storage, workspace);
    expect(storage.values.get(WORKSPACE_STORAGE_KEY)).toBe(JSON.stringify(workspace));
  });

  it("já lê um espaço gravado no formato compacto", () => {
    const workspace = workspaceWith(documentWith(30, 20, true));
    const storage = memoryStorage();
    saveWorkspace(storage, workspace, true);
    const raw = storage.values.get(WORKSPACE_STORAGE_KEY)!;
    expect(raw).toContain('"pts"');
    expect(raw).not.toContain('"points"');
    expect(raw.length).toBeLessThan(JSON.stringify(workspace).length * 0.65);
    expect(loadWorkspace(storage)).toEqual(workspace);
  });

  it("o histórico de versões também lê o formato compacto", () => {
    const workspace = workspaceWith(documentWith(5, 10));
    const storage = memoryStorage();
    recordWorkspaceSnapshot(storage, workspace, 1000);
    const parsed = JSON.parse(storage.values.get(WORKSPACE_HISTORY_KEY)!) as {
      entries: { workspace: unknown }[];
    };
    parsed.entries[0]!.workspace = packWorkspace(parsed.entries[0]!.workspace);
    storage.values.set(WORKSPACE_HISTORY_KEY, JSON.stringify(parsed));
    expect(loadWorkspaceHistory(storage)[0]!.workspace).toEqual(workspace);
  });

  it("o rascunho lê os dois formatos", () => {
    const document = documentWith(4, 8, true);
    const base = documentWith(1, 2);
    const old = encodeHandwritingDraft(document, base);
    expect(decodeHandwritingDraft(old, base)).toEqual(document);
    const packedDraft = JSON.stringify({
      document: packDocument(document),
      base: JSON.stringify(base),
    });
    expect(decodeHandwritingDraft(packedDraft, base)).toEqual(document);
  });
});
