export function stickyTextLayout(text: string, measure: (text: string, size: number) => number) {
  for (let fontSize = 25; fontSize >= 0.25; fontSize -= 0.25) {
    const lines = text.split("\n").flatMap((paragraph) => {
      const result: string[] = [];
      let line = "";
      for (const character of paragraph) {
        if (line && measure(line + character, fontSize) > 224) {
          result.push(line);
          line = "";
        }
        line += character;
      }
      return [...result, line];
    });
    if (lines.length * fontSize * 1.3 <= 174) return { fontSize, lines };
  }
  return { fontSize: 0.25, lines: [text] };
}
