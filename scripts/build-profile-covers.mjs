import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const source = readFileSync(new URL("./profile-cover-art.tsx", import.meta.url), "utf8");
const compiled = ts
  .transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  })
  .outputText.replace("export function ProfileCoverArt", "function ProfileCoverArt");
const Art = new Function("React", `${compiled}; return ProfileCoverArt;`)(React);
const destination = new URL("../public/profile-covers/", import.meta.url);
mkdirSync(destination, { recursive: true });
for (const theme of ["helena", "solar", "aurora", "forest", "ocean"]) {
  const svg = renderToStaticMarkup(React.createElement(Art, { theme })).replace(
    "<svg ",
    '<svg xmlns="http://www.w3.org/2000/svg" ',
  );
  writeFileSync(new URL(`${theme}.svg`, destination), `${svg}\n`);
}
console.log(`Cinco capas vetoriais em ${fileURLToPath(destination)}`);
