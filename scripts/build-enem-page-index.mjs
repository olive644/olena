import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker } from "tesseract.js";
import { questionPageEvents } from "../src/data/enem-question-pages.ts";

const catalog = JSON.parse(fs.readFileSync("public/enem/catalog.json", "utf8"));
const output = "public/enem/page-index";
const cache = "tmp/enem-ocr-cache";
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(cache, { recursive: true });
let worker;
async function ocr(pdfPath, page, name) {
  const base = path.join(cache, `${name}-${page}`);
  if (fs.existsSync(`${base}.txt`)) return fs.readFileSync(`${base}.txt`, "utf8");
  execFileSync(
    "pdftoppm.exe",
    [
      "-f",
      String(page),
      "-l",
      String(page),
      "-singlefile",
      "-scale-to",
      "1800",
      "-jpeg",
      pdfPath,
      base,
    ],
    { stdio: "pipe" },
  );
  worker ??= await createWorker("por", 1, {
    langPath: path.resolve("public/ocr/lang"),
    cachePath: path.resolve(cache),
  });
  const result = await worker.recognize(`${base}.jpg`);
  fs.writeFileSync(`${base}.txt`, result.data.text);
  return result.data.text;
}
const reports = [];
const shard = Number(process.argv[2] ?? 0);
const shards = Number(process.argv[3] ?? 1);
try {
  for (const [position, paper] of catalog.papers.entries()) {
    if (position % shards !== shard) continue;
    const variant = paper.variants[0];
    const name = `${paper.year}-${paper.day}`;
    const destination = `${output}/${variant.id}.json`;
    if (
      fs.existsSync(destination) &&
      JSON.parse(fs.readFileSync(destination, "utf8")).audit.parserVersion === 3
    ) {
      reports.push(JSON.parse(fs.readFileSync(destination, "utf8")).audit);
      continue;
    }
    const pdfPath = `tmp/enem-acervo/${name}.pdf`;
    const loading = getDocument({
      data: new Uint8Array(fs.readFileSync(pdfPath)),
      verbosity: 0,
      useSystemFonts: true,
    });
    const pdf = await loading.promise;
    const pages = {};
    const isLanguages = paper.year >= 2017 ? paper.day === 1 : paper.day === 2;
    const first = paper.year >= 2017 ? (paper.day === 1 ? 1 : 91) : paper.day === 1 ? 1 : 91;
    const foreign = paper.year >= 2017 ? 1 : 91;
    let language = "english";
    const ocrPages = [];
    for (let page = 2; page <= pdf.numPages; page++) {
      let text = (await (await pdf.getPage(page)).getTextContent()).items
        .filter((item) => "str" in item)
        .map((item) => item.str + (item.hasEOL ? "\n" : " "))
        .join("");
      let events = questionPageEvents(text);
      if (!events.some((event) => event.question)) {
        text = await ocr(pdfPath, page, name);
        events = questionPageEvents(text);
        ocrPages.push(page);
      }
      for (const event of events) {
        if (event.language) {
          language = event.language;
          continue;
        }
        const question = event.question;
        if (!question || question < first || question >= first + 90) continue;
        let key = `q:${question}`;
        if (isLanguages && question >= foreign && question < foreign + 5) {
          key = `${language}:${question}`;
          if (pages[key] && language === "english" && !pages[`spanish:${question}`])
            key = `spanish:${question}`;
        }
        pages[key] ??= page;
      }
    }
    const expected = [];
    for (let n = first; n < first + 90; n++) {
      if (isLanguages && n >= foreign && n < foreign + 5)
        expected.push(`english:${n}`, `spanish:${n}`);
      else expected.push(`q:${n}`);
    }
    const missing = expected.filter((key) => !pages[key]);
    const audit = {
      parserVersion: 3,
      year: paper.year,
      day: paper.day,
      mapped: Object.keys(pages).length,
      expected: expected.length,
      missing,
      ocrPages,
    };
    fs.writeFileSync(
      destination,
      JSON.stringify(
        {
          version: 1,
          variantId: variant.id,
          paperUrl: variant.url,
          pageCount: pdf.numPages,
          pages,
          audit,
        },
        null,
        2,
      ) + "\n",
    );
    reports.push(audit);
    console.log(JSON.stringify(audit));
    await loading.destroy();
  }
} finally {
  await worker?.terminate();
}
fs.writeFileSync(
  shards === 1 ? `${output}/audit.json` : `${cache}/audit-${shard}.json`,
  JSON.stringify(reports, null, 2) + "\n",
);
if (reports.some((report) => report.missing.length)) process.exitCode = 1;
