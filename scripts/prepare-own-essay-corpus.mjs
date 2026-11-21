import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const revision = "31e502ff3075e182cdda2560a767be65db677fa5";
const root = "tmp/essay-own-grader";
await mkdir(root, { recursive: true });
const files = [];
for (const name of ["essay-br/essay-br.csv", "essay-br/prompts.csv", "LICENSE", "README.md"]) {
  const url = `https://raw.githubusercontent.com/rafaelanchieta/essay/${revision}/${name}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (name === "LICENSE" && !data.toString("utf8").startsWith("MIT License"))
    throw new Error("Unexpected corpus license");
  await writeFile(`${root}/${name.split("/").at(-1)}`, data);
  files.push({
    path: name,
    bytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
}
const source = {
  repository: "https://github.com/rafaelanchieta/essay",
  revision,
  declaredLicense: "MIT",
  files,
  researchOnly: true,
  redistributionEnabled: false,
  qualification:
    "Repository license recorded; third-party text rights are not independently cleared by this script.",
};
await writeFile(`${root}/source.json`, `${JSON.stringify(source, null, 2)}\n`);
console.log("Pinned MIT-declared corpus prepared in research cache only.");
