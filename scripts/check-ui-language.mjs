import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createHash } from "node:crypto";
const pt = JSON.parse(fs.readFileSync("public/locales/pt-BR.json", "utf8"));
const en = JSON.parse(fs.readFileSync("public/locales/en-US.json", "utf8"));
const errors = [];
const version = createHash("sha256")
  .update(JSON.stringify(pt) + JSON.stringify(en))
  .digest("hex")
  .slice(0, 16);
if (process.argv.includes("--version")) {
  console.log(JSON.stringify({ version, count: pt.length }));
  process.exit(0);
}
const manifest = fs.readFileSync("src/i18n/catalog-version.ts", "utf8");
if (!manifest.includes(JSON.stringify(version)) || !manifest.includes(`= ${pt.length};`))
  errors.push(
    "Language catalog manifest is stale. Run node scripts/check-ui-language.mjs --version and update catalog-version.ts.",
  );
if (pt.length !== en.length) errors.push("Catalog sizes differ");
pt.forEach((text, index) => {
  if (typeof en[index] !== "string" || !en[index].trim())
    errors.push(`Missing English entry ${index}`);
  const tokens = (value) =>
    [...String(value).matchAll(/\{\d+\}/g)]
      .map((match) => match[0])
      .sort()
      .join(",");
  if (tokens(text) !== tokens(en[index])) errors.push(`Interpolation differs at ${index}`);
});
const attrs =
  /^(alt|title|placeholder|aria-label|aria-description|aria-valuetext|label|hint|description|message|text|warning|caption|heading|legend|tooltip|nameFallback)$|(?:Label|Title|Hint|Message|Text|Fallback)$/;
for (const file of fs
  .readdirSync("src", { recursive: true })
  .filter((name) => name.endsWith("tsx") && !name.includes(".test."))) {
  const content = fs.readFileSync(path.join("src", file), "utf8");
  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const bootstrap = ["main.tsx", "components/language-switch.tsx"].includes(
    file.replaceAll("\\", "/"),
  );
  function report(node, text) {
    const location = source.getLineAndCharacterOfPosition(node.getStart(source));
    errors.push(`${file}:${location.line + 1}: ${text}`);
  }
  function walk(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "uiText" &&
      node.arguments[0] &&
      ts.isNumericLiteral(node.arguments[0])
    ) {
      const index = Number(node.arguments[0].text);
      if (!Number.isInteger(index) || index < 0 || index >= pt.length)
        report(node, `Invalid catalog key ${index}`);
      else {
        const positions = [...pt[index].matchAll(/\{(\d+)\}/g)].map((match) => Number(match[1]));
        const expected = positions.length ? Math.max(...positions) + 1 : 0;
        const values = node.arguments[1];
        if (
          (!values && expected) ||
          (values && ts.isArrayLiteralExpression(values) && values.elements.length !== expected)
        )
          report(
            node,
            `Key ${index} expects ${expected} parameters, source: ${node.getText(source)}`,
          );
      }
    }
    if (!bootstrap && ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, " ").trim();
      if (/[a-zA-ZÀ-ÿ]{2}/.test(text)) report(node, `Untranslated JSX text: ${text}`);
    }
    if (
      !bootstrap &&
      ts.isJsxAttribute(node) &&
      attrs.test(node.name.getText(source)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      /[a-zA-ZÀ-ÿ]{2}/.test(node.initializer.text) &&
      !/^https?:\/\//.test(node.initializer.text)
    )
      report(node, `Untranslated attribute: ${node.initializer.text}`);
    ts.forEachChild(node, walk);
  }
  walk(source);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log(`UI language catalogs and JSX wiring OK: ${pt.length} entries per language.`);
