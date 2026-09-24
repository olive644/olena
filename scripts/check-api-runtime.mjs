import { mkdtemp, readdir, readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import ts from "typescript";

// Load emitted server modules with Node's real ESM resolver, without Vite's
// extension fallback. Keep the temporary tree beside package.json for dependencies.
const root = resolve(import.meta.dirname, "..");
const output = await mkdtemp(join(root, ".api-runtime-"));
async function emit(directory) {
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await emit(file);
    else if (/\.tsx?$/.test(file) && !/\.(test|d)\.tsx?$/.test(file)) {
      const result = ts.transpileModule(await readFile(join(root, file), "utf8"), {
        fileName: file,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
        },
      });
      const destination = join(output, file.replace(/\.tsx?$/, ".js"));
      await mkdir(resolve(destination, ".."), { recursive: true });
      await writeFile(destination, result.outputText);
    }
  }
}
try {
  await emit("api");
  await emit("src");
  for (const name of await readdir(join(output, "api"))) {
    if (!name.endsWith(".js")) continue;
    const file = join(output, "api", name);
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(file).href)})`],
      {
        encoding: "utf8",
        timeout: 15000,
      },
    );
    if (result.status !== 0) {
      throw new Error(`${relative(output, file)} failed to load:\n${result.stderr}`);
    }
    console.log(`Node ESM OK: api/${name}`);
  }
} finally {
  await rm(output, { recursive: true, force: true });
}
