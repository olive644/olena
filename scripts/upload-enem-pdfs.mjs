// Envia os PDFs oficiais do Enem (prova e gabarito de cada caderno padrão) para o Vercel Blob, para o
// leitor do app não depender do servidor do Inep, que recusa pedidos vindos da Vercel.
//
// Os arquivos vêm do cache local tmp/enem-acervo (ANO-DIA.pdf e ANO-DIA-answer.pdf), baixados pela
// proprietária em um navegador ou com curl. O caminho no Blob é o mesmo do Inep, sem a barra
// inicial; assim basta apontar a reescrita /enem-pdf do vercel.json para o endereço do Blob.
//
// Uso:
//   node scripts/upload-enem-pdfs.mjs                      (só confere e lista; não envia nada)
//   $env:BLOB_READ_WRITE_TOKEN = "..."                     (token da loja Blob, só nesta sessão)
//   npm install --no-save @vercel/blob                     (não entra no package.json)
//   node scripts/upload-enem-pdfs.mjs --upload
import { existsSync, readFileSync } from "node:fs";

const upload = process.argv.includes("--upload");
const catalog = JSON.parse(readFileSync("public/enem/catalog.json", "utf8"));
const jobs = [];
const problems = [];
for (const paper of catalog.papers) {
  const variant = paper.variants[0];
  for (const [url, suffix] of [
    [variant.url, ""],
    [variant.answerUrl, "-answer"],
  ]) {
    if (!url) continue;
    const local = `tmp/enem-acervo/${paper.year}-${paper.day}${suffix}.pdf`;
    const pathname = new URL(url).pathname.replace(/^\//, "");
    if (
      !/^(enem\/provas_e_gabaritos|educacao_basica\/enem\/(provas|gabaritos|ppl)\/[a-z0-9_/]*)[A-Za-z0-9_./-]+\.pdf$/.test(
        pathname,
      )
    ) {
      problems.push(`caminho inesperado: ${pathname}`);
      continue;
    }
    if (!existsSync(local)) {
      problems.push(`falta ${local}`);
      continue;
    }
    const data = readFileSync(local);
    if (data.subarray(0, 5).toString("latin1") !== "%PDF-") {
      problems.push(`${local} não é PDF`);
      continue;
    }
    jobs.push({ local, pathname, bytes: data.length });
  }
}
const total = jobs.reduce((sum, job) => sum + job.bytes, 0);
console.log(
  `${jobs.length} arquivos prontos, ${(total / 1e6).toFixed(0)} MB. Problemas: ${problems.length}`,
);
for (const problem of problems.slice(0, 20)) console.log(" -", problem);
if (!upload) {
  console.log("Simulação: nada foi enviado. Use --upload com BLOB_READ_WRITE_TOKEN para enviar.");
  process.exit(problems.length ? 1 : 0);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Defina BLOB_READ_WRITE_TOKEN nesta sessão (nunca em arquivo).");
  process.exit(1);
}
const { put } = await import("@vercel/blob");
let first;
for (const job of jobs) {
  const result = await put(job.pathname, readFileSync(job.local), {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 31_536_000,
  });
  first ??= result.url;
  console.log("enviado:", job.pathname);
}
if (first) console.log(`\nEndereço da loja (para o vercel.json): ${new URL(first).origin}`);
