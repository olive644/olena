export type AnswerKeyItem = { str: string; x: number; y: number };
/** Lê linhas da tabela oficial sem depender da ordem interna dos objetos do PDF. */
export function parseOfficialAnswerKey(pages: AnswerKeyItem[][]): Record<string, string> {
  const key: Record<string, string> = {};
  for (const pageItems of pages) {
    const items: AnswerKeyItem[] = [];
    for (const item of [...pageItems].sort((a, b) =>
      Math.abs(a.y - b.y) < 2 ? a.x - b.x : b.y - a.y,
    )) {
      const last = items.at(-1);
      if (
        last &&
        /^\d+$/.test(last.str) &&
        /^\d+$/.test(item.str) &&
        Math.abs(last.y - item.y) < 2 &&
        item.x - last.x < 18 &&
        (last.str + item.str).length <= 3
      )
        last.str += item.str;
      else items.push({ ...item, str: item.str.trim() });
    }
    for (const item of items) {
      const cancelled = item.str.match(/Quest[aã]o\s+(\d+)\s+Anulad[ao]/i);
      if (cancelled) key[`q:${Number(cancelled[1])}`] = "ANULADA";
    }
    const numbers = items.filter(
      (item) =>
        /^\d{1,3}$/.test(item.str.trim()) && Number(item.str) >= 1 && Number(item.str) <= 180,
    );
    for (const number of numbers) {
      const nextNumber = numbers
        .filter((item) => item.x > number.x + 2 && Math.abs(item.y - number.y) < 2)
        .sort((a, b) => a.x - b.x)[0];
      const letters = items
        .filter(
          (item) =>
            /^(?:[A-E]|ANULAD[AO])$/i.test(item.str.trim()) &&
            Math.abs(item.y - number.y) < 2 &&
            item.x > number.x &&
            item.x - number.x < 180 &&
            (!nextNumber || item.x < nextNumber.x),
        )
        .sort((a, b) => a.x - b.x);
      const n = Number(number.str);
      if (letters.length === 2) {
        key[`english:${n}`] = letters[0]!.str.trim().toUpperCase().replace("ANULADO", "ANULADA");
        key[`spanish:${n}`] = letters[1]!.str.trim().toUpperCase().replace("ANULADO", "ANULADA");
      } else if (letters.length === 1)
        key[`q:${n}`] = letters[0]!.str.trim().toUpperCase().replace("ANULADO", "ANULADA");
    }
  }
  return key;
}

export function scoreEnemAnswers(
  rows: { key: string }[],
  sectionId: string,
  answers: Record<string, string>,
  key: Record<string, string>,
) {
  if (!rows.length || rows.some((row) => !key[row.key]))
    throw new Error("Gabarito incompleto para esta área");
  const counted = rows.filter((row) => key[row.key] !== "ANULADA");
  const correct = counted.filter(
    (row) => answers[`${sectionId}:${row.key}`] === key[row.key],
  ).length;
  return {
    correct,
    total: counted.length,
    percentage: counted.length ? Math.round((correct / counted.length) * 100) : 0,
  };
}

const cache = new Map<string, Promise<Record<string, string>>>();
export function loadEnemAnswerKey(url: string): Promise<Record<string, string>> {
  const existing = cache.get(url);
  if (existing) return existing;
  const loading = (async () => {
    const [reader, worker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    reader.GlobalWorkerOptions.workerSrc = worker.default;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Gabarito indisponível");
    const task = reader.getDocument({ data: await response.arrayBuffer() });
    const document = await task.promise;
    try {
      const pages: AnswerKeyItem[][] = [];
      for (let page = 1; page <= document.numPages; page++)
        pages.push(
          (await (await document.getPage(page)).getTextContent()).items.flatMap((item) =>
            "str" in item ? [{ str: item.str, x: item.transform[4]!, y: item.transform[5]! }] : [],
          ),
        );
      return parseOfficialAnswerKey(pages);
    } finally {
      await task.destroy();
    }
  })();
  cache.set(url, loading);
  void loading.catch(() => cache.delete(url));
  return loading;
}
