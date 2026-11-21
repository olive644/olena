import { createHunspellFromStrings, type Hunspell } from "hunspell-wasm";
import affUrl from "../../node_modules/dictionary-pt/index.aff?url";
import dicUrl from "../../node_modules/dictionary-pt/index.dic?url";
import { reviewEssaySpelling } from "../domain/essay-proofreading";

let dictionary: Promise<Hunspell> | undefined;
function loadDictionary() {
  dictionary ??= Promise.all(
    [affUrl, dicUrl].map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Dictionary unavailable");
      return response.text();
    }),
  ).then(([aff, dic]) => createHunspellFromStrings(aff!, dic!));
  return dictionary;
}
self.onmessage = async (event: MessageEvent<{ id: number; text: string }>) => {
  const { id, text } = event.data;
  try {
    const spell = await loadDictionary();
    const result = reviewEssaySpelling(text, {
      correct: (word) => spell.testSpelling(word),
      suggest: (word) => spell.getSpellingSuggestions(word),
    });
    self.postMessage({ id, result });
  } catch {
    dictionary = undefined;
    self.postMessage({ id, error: true });
  }
};
