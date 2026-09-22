// Conservative local corrections. Ambiguous words stay with the browser's suggestions.
const accents: Record<string, string> = {
  voce: "você",
  voces: "vocês",
  nao: "não",
  tambem: "também",
  ate: "até",
  ja: "já",
  so: "só",
  eh: "é",
  estao: "estão",
  pagina: "página",
  paginas: "páginas",
  informacao: "informação",
  informacoes: "informações",
  organizacao: "organização",
  organizacoes: "organizações",
  possivel: "possível",
  possiveis: "possíveis",
  dificil: "difícil",
  dificeis: "difíceis",
  proxima: "próxima",
  proximo: "próximo",
  anotacao: "anotação",
  anotacoes: "anotações",
  revisao: "revisão",
  exercicio: "exercício",
  exercicios: "exercícios",
  matematica: "matemática",
  portugues: "português",
  conteudo: "conteúdo",
};

export function reviewPortugueseText(text: string): string {
  return text
    .split(/(```[\s\S]*?```|`[^`]*`|https?:\/\/\S+|\S+@\S+)/g)
    .map((part, index) => {
      if (index % 2) return part;
      return part
        .replace(/\p{L}+/gu, (word) => {
          const key = word.toLocaleLowerCase("pt-BR");
          const corrected = Object.hasOwn(accents, key) ? accents[key] : undefined;
          if (!corrected) return word;
          if (word === word.toUpperCase()) return corrected.toUpperCase();
          return word.charAt(0) === word.charAt(0).toUpperCase()
            ? corrected.charAt(0).toUpperCase() + corrected.slice(1)
            : corrected;
        })
        .replace(
          /(^\s*|[!?]\s+|(?<!\d)\.\s+|\n\s*|:\s+)([a-zá-úç])/gu,
          (_, prefix: string, letter: string) => prefix + letter.toLocaleUpperCase("pt-BR"),
        );
    })
    .join("");
}
