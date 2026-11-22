import type { EnemSection } from "./enem-sections";
import type { EnemLanguage } from "./enem-tri";

export function answerRows(section: EnemSection, language?: EnemLanguage) {
  if (!section.question) return [];
  const first = section.question;
  if (section.id === "languages")
    return [
      ...Array.from({ length: 5 }, (_, i) => ({
        key: `english:${first + i}`,
        number: first + i,
        group: "Inglês",
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        key: `spanish:${first + i}`,
        number: first + i,
        group: "Espanhol",
      })),
      ...Array.from({ length: 40 }, (_, i) => ({
        key: `q:${first + i + 5}`,
        number: first + i + 5,
        group: "Linguagens",
      })),
    ].filter((row) => !language || row.key.startsWith("q:") || row.key.startsWith(`${language}:`));
  return Array.from({ length: 45 }, (_, i) => ({
    key: `q:${first + i}`,
    number: first + i,
    group: section.label,
  }));
}
