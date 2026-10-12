import { build } from "vite";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
await build({
  configFile: false,
  publicDir: false,
  root,
  resolve: {
    alias: {
      three: fileURLToPath(new URL("./helena-mascot/vendor/three.module.js", import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL("./helena-mascot/runtime.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "runtime.js",
    },
    outDir: "public/helena-assistant",
    emptyOutDir: false,
    minify: true,
  },
});
