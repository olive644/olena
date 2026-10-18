import { expect, it } from "vitest";
import { createStudyDataExport } from "./study-data-export";
import { createInitialWorkspace } from "../domain/workspace";
import { loadWorkspace, WORKSPACE_STORAGE_KEY } from "./local-workspace";

it("exporta somente a lista permitida, sem credenciais nem caches de outras contas", () => {
  const workspace = createInitialWorkspace();
  const data = createStudyDataExport(workspace, {
    "firebase:authUser:test": "not-an-exportable-token",
    "other-account-cache": "private",
    "helena.profile.v1": JSON.stringify({ name: "Aluno" }),
    [WORKSPACE_STORAGE_KEY]: "cópia antiga",
  });
  expect(data.version).toBe(1);
  expect(Number.isFinite(Date.parse(data.exportedAt))).toBe(true);
  expect(Object.keys(data.storage).sort()).toEqual(
    ["helena.profile.v1", WORKSPACE_STORAGE_KEY].sort(),
  );
  expect(JSON.stringify(data)).not.toContain("not-an-exportable-token");
  expect(JSON.stringify(data)).not.toContain("other-account-cache");
  const restored = loadWorkspace({ getItem: (key) => data.storage[key] ?? null });
  expect(restored).toEqual(workspace);
});
