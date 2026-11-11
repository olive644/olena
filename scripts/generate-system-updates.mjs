import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function updatesFromPulls(pulls, before = Infinity, commit = "") {
  if (!Array.isArray(pulls)) throw new Error("Resposta de atualizações inválida");
  return pulls
    .filter(
      (pr) =>
        pr.base?.ref === "main" &&
        pr.merged_at &&
        pr.number >= 408 &&
        (new Date(pr.merged_at).getTime() <= before || (commit && pr.merge_commit_sha === commit)),
    )
    .sort((a, b) => new Date(b.merged_at) - new Date(a.merged_at))
    .slice(0, 50)
    .map((pr) => ({
      id: pr.number,
      version: `beta.${pr.number}`,
      title: String(pr.title).slice(0, 200),
      date: pr.merged_at,
    }));
}

// Em repositório privado a API do GitHub responde 404 a quem não tem credencial. O build usa um
// token só de leitura (GITHUB_READ_TOKEN, variável da Vercel) para listar as pull requests
// mescladas. O token só vai no cabeçalho da requisição: nunca é gravado em dist nem impresso.
export function githubHeaders(env = process.env) {
  const token = env.GITHUB_READ_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function githubFailure(status, env = process.env) {
  const hint =
    [401, 403, 404].includes(status) && !env.GITHUB_READ_TOKEN
      ? ", repositório privado? defina GITHUB_READ_TOKEN na Vercel"
      : "";
  return new Error(`GitHub ${status}${hint}`);
}

async function generate() {
  const request = async (path) => {
    const response = await fetch(`https://api.github.com/repos/olive644/olena/${path}`, {
      headers: githubHeaders(),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw githubFailure(response.status);
    return response.json();
  };
  try {
    let before = Infinity;
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      const commit = await request(
        `commits/${encodeURIComponent(process.env.VERCEL_GIT_COMMIT_SHA)}`,
      );
      before = new Date(commit.commit.committer.date).getTime();
      if (!Number.isFinite(before)) throw new Error("Data de publicação inválida");
    }
    const pulls = await request("pulls?state=closed&sort=updated&direction=desc&per_page=100");
    const updates = updatesFromPulls(pulls, before, process.env.VERCEL_GIT_COMMIT_SHA);
    if (!updates.length) throw new Error("Nenhuma atualização confirmada");
    await writeFile("dist/system-updates.json", JSON.stringify(updates));
    await writeFile("dist/app-version.json", JSON.stringify({ number: updates[0].id }));
    console.log(`${updates.length} atualizações públicas confirmadas no build.`);
  } catch (error) {
    // O manifesto conhecido copiado de public permanece disponível, sem inventar versões.
    console.warn(`Atualizações: mantido manifesto conhecido (${error.message}).`);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await generate();
