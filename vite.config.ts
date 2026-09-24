import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// O preview (e2e e teste local do build) serve os mesmos cabeçalhos de segurança da
// produção, inclusive o CSP. Sem isso, algo que o CSP bloqueia só falha depois do deploy.
type HeaderRule = { source: string; headers: { key: string; value: string }[] };
const vercelConfig = JSON.parse(
  readFileSync(new URL("./vercel.json", import.meta.url), "utf8"),
) as { headers: HeaderRule[] };
const productionHeaders = Object.fromEntries(
  (vercelConfig.headers.find((rule) => rule.source === "/(.*)")?.headers ?? []).map((header) => [
    header.key,
    header.value,
  ]),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom"],
    // O tesseract.js carrega o regenerator-runtime só para navegadores sem async e
    // await nativos. O build é ES2022, então o polyfill (6,6 KB) nunca é usado.
    alias: {
      "regenerator-runtime/runtime": fileURLToPath(
        new URL("./src/build-empty-module.ts", import.meta.url),
      ),
    },
  },
  // sourcemap fica desligado no build de produção: um .map publicado exporia o
  // código-fonte original (não só o bundle minificado) a qualquer visitante.
  build: { target: "es2022", sourcemap: false, manifest: true },
  preview: { headers: productionHeaders },
});
