import { READY_LISTENING_DECK } from "./ready-listening-words";

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Listas locais escolhem apenas palavras que já possuem áudio no aplicativo.
export function importListeningBank(text: string): { ids: string[]; missing: string[] } {
  if (text.length > 64_000) throw new Error("Use uma lista de até 64 KB.");
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length > 501) throw new Error("Use uma lista com até 500 linhas.");
  const ids = new Set<string>();
  const missing: string[] = [];
  for (const [index, line] of lines.entries()) {
    const match = line.match(/^\s*(?:"((?:[^"]|"")*)"|([^,;\t=]+))(?:[,;\t=]|$)/);
    if (!match) throw new Error(`Confira o formato da linha ${index + 1}.`);
    const word = (match[1] ?? match[2] ?? "").replace(/""/g, '"').trim();
    if (index === 0 && ["word", "palavra", "english", "ingles"].includes(normalize(word))) continue;
    const card = READY_LISTENING_DECK.find((item) =>
      [item.front, item.back, ...(item.acceptedAnswers ?? [])].some(
        (value) => normalize(value) === normalize(word),
      ),
    );
    if (card) ids.add(card.id);
    else missing.push(word);
  }
  return { ids: [...ids], missing };
}
