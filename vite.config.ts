import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
});
