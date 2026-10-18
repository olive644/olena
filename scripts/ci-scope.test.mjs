import { test } from "node:test";
import assert from "node:assert/strict";
import { decideScope, evaluateGate, isBackendFile, isDocsFile, matrixFor } from "./ci-scope.mjs";

test("pull request só com documentação não roda e2e", () => {
  assert.equal(
    decideScope({
      event: "pull_request",
      changedFiles: ["docs/CURRENT_STATE_AUDIT.md", "README.md", ".gitleaksignore", "LICENSE"],
    }),
    "none",
  );
});

test("qualquer arquivo de interface, de teste ou do CI na pull request pede o e2e completo", () => {
  for (const file of [
    "src/hooks/use-cloud-sync.ts",
    "src/components/handwriting-studio.tsx",
    "src/domain/handwriting.ts",
    "src/styles.css",
    "e2e/room.spec.ts",
    "package.json",
    "vite.config.ts",
    ".github/workflows/application.yml",
    "scripts/ci-scope.mjs",
    "public/helena.png",
  ])
    assert.equal(decideScope({ event: "pull_request", changedFiles: ["docs/a.md", file] }), "full");
});

test("pull request só de backend e documentação roda só o desktop", () => {
  assert.equal(
    decideScope({
      event: "pull_request",
      changedFiles: ["api/speech.ts", "src/backend/speech-quota.ts", "docs/SECOND_BRAIN.md"],
    }),
    "desktop",
  );
  assert.equal(
    decideScope({
      event: "pull_request",
      changedFiles: ["firebase-room.rules.json", "src/firebase-user-rules.test.ts"],
    }),
    "desktop",
  );
});

test("um único arquivo de interface junto com backend volta ao e2e completo", () => {
  assert.equal(
    decideScope({
      event: "pull_request",
      changedFiles: ["src/backend/local-room-handler.ts", "src/components/local-room.tsx"],
    }),
    "full",
  );
  assert.equal(
    decideScope({ event: "pull_request", changedFiles: ["src/backend/a.ts", "package.json"] }),
    "full",
  );
});

test("os padrões de backend não pegam arquivos de interface com nomes parecidos", () => {
  assert.equal(isBackendFile("src/backend/x.ts"), true);
  assert.equal(isBackendFile("api/x.ts"), true);
  assert.equal(isBackendFile("src/components/backend-badge.tsx"), false);
  assert.equal(isBackendFile("src/data/api/x.ts"), false);
  assert.equal(isBackendFile("apis/x.ts"), false);
  assert.equal(isBackendFile("src/backend-ui/x.ts"), false);
});

test("na dúvida, o e2e roda inteiro", () => {
  assert.equal(decideScope({ event: "pull_request", changedFiles: undefined }), "full");
  assert.equal(decideScope({ event: "pull_request", changedFiles: [] }), "full");
  assert.equal(decideScope({ event: "pull_request", changedFiles: [""] }), "full");
  assert.equal(decideScope({ event: "workflow_dispatch" }), "full");
  assert.equal(decideScope({ event: "schedule" }), "full");
  assert.equal(decideScope({ event: "algo-novo" }), "full");
});

test("push na main roda só o desktop, mesmo que só documentação tenha mudado", () => {
  assert.equal(decideScope({ event: "push", changedFiles: ["src/a.ts"] }), "desktop");
  assert.equal(decideScope({ event: "push", changedFiles: ["docs/a.md"] }), "desktop");
});

test("a matriz corresponde ao escopo", () => {
  assert.deepEqual(
    matrixFor("full").include.map((entry) => entry.label),
    ["desktop", "mobile shard 1/2", "mobile shard 2/2"],
  );
  assert.deepEqual(
    matrixFor("desktop").include.map((entry) => entry.label),
    ["desktop"],
  );
  assert.equal(matrixFor("full").include[1].browser, "webkit");
});

test("padrões de documentação não pegam código com nomes parecidos", () => {
  assert.equal(isDocsFile("docs/x.png"), true);
  assert.equal(isDocsFile("src/docs/x.ts"), false);
  assert.equal(isDocsFile("src/readme-helper.ts"), false);
  assert.equal(isDocsFile("notes.md.ts"), false);
});

test("o gate só aceita e2e pulado quando o escopo é none e a decisão deu certo", () => {
  const base = { job: "e2e", changesResult: "success" };
  assert.equal(evaluateGate({ ...base, scope: "none", e2eResult: "skipped" }).ok, true);
  assert.equal(evaluateGate({ ...base, scope: "none", e2eResult: "success" }).ok, false);
  assert.equal(evaluateGate({ ...base, scope: "full", e2eResult: "skipped" }).ok, false);
  assert.equal(evaluateGate({ ...base, scope: "desktop", e2eResult: "skipped" }).ok, false);
});

test("o gate falha quando a decisão de escopo falhou, em vez de passar por tudo ter sido pulado", () => {
  for (const changesResult of ["failure", "cancelled", "skipped", ""])
    assert.equal(
      evaluateGate({ job: "e2e", scope: "none", changesResult, e2eResult: "skipped" }).ok,
      false,
    );
});

test("o gate exige sucesso do e2e quando ele deveria rodar", () => {
  for (const scope of ["full", "desktop"]) {
    assert.equal(
      evaluateGate({ job: "e2e", scope, changesResult: "success", e2eResult: "success" }).ok,
      true,
    );
    for (const e2eResult of ["failure", "cancelled", "skipped", ""])
      assert.equal(
        evaluateGate({ job: "e2e", scope, changesResult: "success", e2eResult }).ok,
        false,
      );
  }
});

test("escopo desconhecido ou vazio nunca passa", () => {
  for (const scope of ["", "tudo", undefined])
    assert.equal(
      evaluateGate({ job: "mobile", scope, changesResult: "success", e2eResult: "success" }).ok,
      false,
    );
});

test("na main o gate móvel avisa que o mobile completo não roda de novo", () => {
  const result = evaluateGate({
    job: "mobile",
    scope: "desktop",
    changesResult: "success",
    e2eResult: "success",
  });
  assert.equal(result.ok, true);
  assert.match(result.message, /pull request/);
});
