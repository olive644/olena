/** Cabeçalhos, não ocorrências do número no corpo do enunciado. Também aceita fragmentos do PDF. */
export function questionPageEvents(text: string) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const events: { position: number; question?: number; language?: "english" | "spanish" }[] = [];
  const headings = /\bQ\s*U\s*E\s*S\s*T\s*A\s*[O0][ \t:.-]*([0-9OIl](?:[ \t]?[0-9]){0,2})(?!\d)/gi;
  for (const match of normalized.matchAll(headings)) {
    const question = Number(
      match[1]!.replace(/\s/g, "").replace(/O/gi, "0").replace(/[Il]/gi, "1"),
    );
    if (question >= 1 && question <= 180) events.push({ position: match.index, question });
  }
  for (const match of normalized.matchAll(/OPCAO[\s:()]*?(INGLES|ESPANHOL)/gi))
    events.push({
      position: match.index,
      language: match[1]!.toUpperCase() === "INGLES" ? "english" : "spanish",
    });
  return events.sort((a, b) => a.position - b.position);
}

export type EnemPageIndex = {
  version: 1;
  variantId: string;
  paperUrl: string;
  pageCount: number;
  pages: Record<string, number>;
};

export async function loadQuestionPageIndex(
  variantId: string,
  paperUrl: string,
): Promise<EnemPageIndex | null> {
  if (!/^[a-f0-9]{14}$/.test(variantId)) return null;
  const response = await fetch(`/enem/page-index/${variantId}.json`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Índice de páginas indisponível");
  const data = (await response.json()) as EnemPageIndex;
  const source = new URL(data.paperUrl);
  const samePaper =
    data.paperUrl === paperUrl ||
    (source.origin === "https://download.inep.gov.br" &&
      `/enem-pdf${source.pathname}` === paperUrl);
  if (
    data.version !== 1 ||
    data.variantId !== variantId ||
    !samePaper ||
    !Number.isInteger(data.pageCount) ||
    data.pageCount < 1 ||
    !data.pages ||
    Object.entries(data.pages).some(
      ([key, page]) =>
        !/^(?:q|english|spanish):\d{1,3}$/.test(key) ||
        !Number.isInteger(page) ||
        page < 1 ||
        page > data.pageCount,
    )
  )
    throw new Error("Índice de outro caderno ou páginas inválidas");
  return data;
}
