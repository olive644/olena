import { mkdir, writeFile } from "node:fs/promises";
import { lessons, passesArithmeticCheck } from "../src/ai/olena-corpus.ts";
import { draftDigest } from "./olena-learning.mjs";

const endpoint = "https://olenastudy.vercel.app/api/olena-learning";
const token = process.env["OLENA_LEARNING_SERVICE_TOKEN"];
if (!token || token.length < 64) throw new Error("Configure o segredo do job.");
let payload;
for (let index = 0; index < 2; index++) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Geração indisponível (${response.status}). Sem repetição.`);
  const raw = await response.text();
  if (raw.length > 600000) throw new Error("Corpus muito longo.");
  payload = JSON.parse(raw);
}
if (payload?.publicSynthetic !== true || !Array.isArray(payload.drafts))
  throw new Error("Corpus inválido.");
const ids = new Set();
const drafts = payload.drafts.filter((draft) => {
  const lesson = lessons.find((item) => item.id === draft.id);
  if (
    !lesson ||
    ids.has(draft.id) ||
    draft.prompt !== lesson.prompt ||
    draft.reference !== lesson.reference ||
    draft.check !== "arithmetic-only" ||
    typeof draft.answer !== "string" ||
    !passesArithmeticCheck(draft.answer, lesson.reference) ||
    draft.teacher !== "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
  )
    throw new Error("Proveniência inválida.");
  ids.add(draft.id);
  return true;
});
if (!drafts.length) throw new Error("Nenhum exemplo elegível para candidato.");
await mkdir(".olena-learning", { recursive: true });
await writeFile(
  ".olena-learning/candidate-train.jsonl",
  drafts
    .map((draft) =>
      JSON.stringify({
        digest: draftDigest(draft),
        check: "arithmetic-only",
        publicSynthetic: true,
        teacher: draft.teacher,
        messages: [
          {
            role: "system",
            content:
              "Você é Helena, tutora da OlenaStudy. Ensine em português brasileiro, por etapas, sem inventar informações.",
          },
          { role: "user", content: draft.prompt },
          { role: "assistant", content: draft.answer },
        ],
      }),
    )
    .join("\n") + "\n",
);
console.log(`${drafts.length} exemplos sintéticos. Checagem aritmética não é revisão pedagógica.`);
