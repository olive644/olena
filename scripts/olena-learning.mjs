import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { lessons } from "../src/ai/olena-corpus.ts";
export { lessons };

// Somente exemplos sintéticos. Nenhuma conversa ou material privado entra aqui.

export const digest = (text) => createHash("sha256").update(text).digest("hex");
export const draftDigest = (draft) =>
  digest(
    JSON.stringify({
      id: draft.id,
      prompt: draft.prompt,
      reference: draft.reference,
      answer: draft.answer,
      teacher: draft.teacher,
    }),
  );
export function approvedTrainingRows(drafts, reviews) {
  const ids = new Set();
  return drafts
    .filter((draft) => {
      const valid =
        typeof draft.id === "string" &&
        typeof draft.prompt === "string" &&
        typeof draft.answer === "string" &&
        draft.answer.trim() &&
        draft.answer.length <= 12000 &&
        reviews.some(
          (review) =>
            review.id === draft.id &&
            review.digest === draftDigest(draft) &&
            review.approved === true &&
            typeof review.reviewer === "string" &&
            review.reviewer.trim(),
        );
      if (!valid || ids.has(draft.id)) return false;
      ids.add(draft.id);
      return true;
    })
    .map((draft) => ({
      messages: [
        {
          role: "system",
          content:
            "Você é Olena, tutora da OlenaStudy. Ensine em português brasileiro, por etapas, sem inventar informações.",
        },
        { role: "user", content: draft.prompt },
        { role: "assistant", content: draft.answer },
      ],
    }));
}
async function rows(file) {
  try {
    return (await readFile(file, "utf8"))
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
async function main() {
  const [command, id, reviewer] = process.argv.slice(2);
  const directory = resolve(".olena-learning");
  const draftsPath = join(directory, "drafts.jsonl");
  const reviewsPath = join(directory, "reviews.jsonl");
  await mkdir(directory, { recursive: true });
  const drafts = await rows(draftsPath);
  if (command === "generate") {
    if (process.env["OLENA_DISTILLATION_RIGHTS_CONFIRMED"] !== "true")
      throw new Error(
        "Confirme os termos do provedor e a licença do modelo antes de gerar dados para treinamento.",
      );
    const account = process.env["CLOUDFLARE_ACCOUNT_ID"];
    const token = process.env["CLOUDFLARE_API_TOKEN"];
    const model = process.env["OLENA_TEACHER_MODEL"] ?? "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
    if (!account || !token || !/^[a-f0-9]{32}$/i.test(account) || !/^@cf\/[\w./-]+$/.test(model))
      throw new Error("Configure o professor Cloudflare no ambiente privado.");
    const batch = lessons
      .filter((lesson) => !drafts.some((draft) => draft.id === lesson.id))
      .slice(0, 5);
    for (const lesson of batch) {
      const result = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(20000),
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content:
                  "Produza um exemplo didático em português. A referência matemática fornecida é verificada. Não invente dados pessoais ou ações da aplicação.",
              },
              { role: "user", content: `${lesson.prompt}\nReferência: ${lesson.reference}` },
            ],
            max_tokens: 500,
          }),
        },
      );
      if (!result.ok)
        throw new Error(`Professor indisponível (${result.status}). Nenhuma repetição automática.`);
      const raw = await result.text();
      if (raw.length > 64000) throw new Error("Resposta muito longa.");
      const payload = JSON.parse(raw);
      const answer = payload.success === true ? payload.result?.response : undefined;
      if (typeof answer !== "string" || !answer.trim() || answer.length > 12000)
        throw new Error("Resposta inválida.");
      await appendFile(
        draftsPath,
        JSON.stringify({
          ...lesson,
          answer,
          teacher: model,
          generatedAt: new Date().toISOString(),
        }) + "\n",
      );
      console.log(`Rascunho criado: ${lesson.id}. Precisa de revisão.`);
    }
    console.log(`${batch.length} exemplos gerados. Isso não treinou o modelo.`);
  } else if (command === "approve") {
    const draft = drafts.find((item) => item.id === id);
    if (!draft || !reviewer?.trim())
      throw new Error(
        "Informe ID do exemplo e identificação do revisor após revisar o texto e a referência.",
      );
    await appendFile(
      reviewsPath,
      JSON.stringify({
        id,
        digest: draftDigest(draft),
        approved: true,
        reviewer,
        reviewedAt: new Date().toISOString(),
      }) + "\n",
    );
    console.log(`Revisão registrada: ${id}`);
  } else if (command === "export") {
    const approved = approvedTrainingRows(drafts, await rows(reviewsPath));
    if (!approved.length) throw new Error("Nenhum exemplo aprovado. Exportação bloqueada.");
    await writeFile(
      join(directory, "train.jsonl"),
      approved.map((row) => JSON.stringify(row)).join("\n") + "\n",
    );
    console.log(`${approved.length} exemplos exportados para treinamento, ainda não executado.`);
  } else throw new Error("Use generate, approve <id> <revisor> ou export.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(() => {
    console.error(
      "Operação não concluída. Confira configuração, comando, revisão e disponibilidade do professor. Segredos não são exibidos.",
    );
    process.exitCode = 1;
  });
