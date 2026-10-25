// Decide quanto do e2e o CI precisa rodar e se os checks de resultado devem passar.
//
// O e2e Chromium, em desktop e mobile, responde por quase todos os minutos de cada execução.
// Em repositório privado o plano gratuito do GitHub tem um teto mensal de minutos, então o CI
// roda só o que cada tipo de mudança exige:
//   full    pull request que mexe na interface ou em qualquer outra coisa, execução semanal e
//           execução manual: desktop e mobile.
//   desktop push na main: o mesmo código já passou completo na pull request.
//   none    pull request que só mexe em documentação: nenhum e2e.
//   desktop também vale para pull request que só mexe em backend e documentação: o mobile
//           só difere do desktop em layout e toque, e o backend roda igual nos dois.
// Em caso de dúvida (erro ao listar os arquivos, evento desconhecido) o escopo é "full".
// Medição que embasa isto (execução completa de 18/10/2026, ver docs/CI_MINUTOS.md): o e2e é
// cerca de 68% dos minutos faturáveis e o mobile sozinho cerca de metade; instalar os
// navegadores custa só 22 a 44 s por job, então cache de navegador não compensa.
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DOCS_ONLY = [/^docs\//, /\.md$/i, /^LICENSE/, /^\.gitignore$/, /^\.gitleaksignore$/];

const MATRIX = {
  desktop: { project: "desktop", label: "desktop", browser: "chromium", workers: 2, shard: "1/1" },
  mobile1: {
    project: "mobile",
    label: "mobile shard 1/2",
    browser: "chromium",
    workers: 1,
    shard: "1/2",
  },
  mobile2: {
    project: "mobile",
    label: "mobile shard 2/2",
    browser: "chromium",
    workers: 1,
    shard: "2/2",
  },
};

// Somente o servidor e as regras do banco. Nada aqui é carregado pelo navegador. Padrão novo
// entra por inclusão: o que não estiver nesta lista conta como interface e pede o mobile.
const BACKEND_ONLY = [
  /^api\//,
  /^src\/backend\//,
  /^firebase-room\.rules\.json$/,
  /^src\/firebase-user-rules\.test\.ts$/,
];

export const isDocsFile = (file) => DOCS_ONLY.some((pattern) => pattern.test(file));
export const isBackendFile = (file) => BACKEND_ONLY.some((pattern) => pattern.test(file));

export function decideScope({ event, changedFiles }) {
  if (event === "push") return "desktop";
  if (event !== "pull_request") return "full";
  if (!Array.isArray(changedFiles)) return "full";
  const files = changedFiles.map((file) => file.trim()).filter(Boolean);
  if (files.length === 0) return "full";
  if (files.every(isDocsFile)) return "none";
  if (files.every((file) => isDocsFile(file) || isBackendFile(file))) return "desktop";
  return "full";
}

export function matrixFor(scope) {
  const include =
    scope === "desktop"
      ? [MATRIX.desktop]
      : scope === "full"
        ? [MATRIX.desktop, MATRIX.mobile1, MATRIX.mobile2]
        : [MATRIX.desktop];
  return { include };
}

// Quem exige "Desktop and mobile smoke tests" precisa de um resultado honesto: o gate nunca
// passa quando o escopo não pôde ser decidido, e só aceita e2e pulado quando o escopo é "none".
export function evaluateGate({ job, scope, changesResult, e2eResult }) {
  if (changesResult !== "success")
    return { ok: false, message: `Não foi possível decidir o escopo do e2e (${changesResult}).` };
  if (scope === "none")
    return e2eResult === "skipped"
      ? { ok: true, message: "Só documentação mudou: e2e dispensado." }
      : { ok: false, message: `Escopo "none" com e2e em estado "${e2eResult}".` };
  if (scope === "desktop")
    return e2eResult === "success"
      ? {
          ok: true,
          message:
            job === "mobile"
              ? "Push na main: o mobile completo já passou na pull request e não roda de novo."
              : "Desktop passou.",
        }
      : { ok: false, message: `Resultado do e2e: ${e2eResult}.` };
  if (scope === "full")
    return e2eResult === "success"
      ? { ok: true, message: "Desktop e mobile passaram." }
      : { ok: false, message: `Resultado do e2e: ${e2eResult}.` };
  return { ok: false, message: `Escopo desconhecido: "${scope}".` };
}

function changedFilesOfPullRequest() {
  try {
    // O checkout de pull request é o commit de mesclagem: o primeiro pai é a base.
    return execFileSync("git", ["diff", "--name-only", "HEAD^1", "HEAD"], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch {
    return undefined;
  }
}

function main(argv, env) {
  const [command, ...flags] = argv;
  if (command === "scope") {
    const event = env.EVENT_NAME ?? "";
    const scope = decideScope({
      event,
      changedFiles: event === "pull_request" ? changedFilesOfPullRequest() : undefined,
    });
    const lines = `scope=${scope}\nmatrix=${JSON.stringify(matrixFor(scope))}\n`;
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, lines);
    console.log(lines.trim());
    return 0;
  }
  if (command === "gate") {
    const job = flags.find((flag) => flag.startsWith("--job="))?.slice(6) ?? "e2e";
    const result = evaluateGate({
      job,
      scope: env.SCOPE ?? "",
      changesResult: env.CHANGES_RESULT ?? "",
      e2eResult: env.E2E_RESULT ?? "",
    });
    console.log(result.message);
    return result.ok ? 0 : 1;
  }
  console.error("Uso: ci-scope.mjs scope | gate --job=e2e|mobile");
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exit(main(process.argv.slice(2), process.env));
