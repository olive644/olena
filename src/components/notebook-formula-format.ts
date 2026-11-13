/** Subconjunto editável: frações, raízes, expoentes, índices e símbolos comuns. */
export type FormulaNode =
  | { kind: "text"; text: string }
  | { kind: "row"; children: FormulaNode[] }
  | { kind: "fraction"; top: FormulaNode; bottom: FormulaNode }
  | { kind: "root"; body: FormulaNode }
  | { kind: "script"; body: FormulaNode; raised: boolean };

export function parseNotebookFormula(source: string): FormulaNode {
  const input = source.slice(0, 240);
  let position = 0;
  function group(depth: number): FormulaNode {
    if (input[position] !== "{") return { kind: "text", text: input[position++] ?? "" };
    position++;
    return row(depth + 1, true);
  }
  function row(depth: number, grouped = false): FormulaNode {
    const children: FormulaNode[] = [];
    if (depth > 24) {
      const text = input.slice(position);
      position = input.length;
      return { kind: "text", text };
    }
    while (position < input.length) {
      const character = input[position++] ?? "";
      if (character === "}" && grouped) break;
      if (character === "^") children.push({ kind: "script", body: group(depth), raised: true });
      else if (character === "_")
        children.push({ kind: "script", body: group(depth), raised: false });
      else if (character === "\\") {
        const command = /^[a-z]+/i.exec(input.slice(position))?.[0] ?? "";
        position += command.length;
        if (command === "frac" && input[position] === "{") {
          const top = group(depth);
          if (input[position] === "{")
            children.push({ kind: "fraction", top, bottom: group(depth) });
          else children.push({ kind: "text", text: "\\frac" }, top);
        } else if (command === "sqrt" && input[position] === "{") {
          children.push({ kind: "root", body: group(depth) });
        } else {
          const symbols: Record<string, string> = {
            times: "×",
            cdot: "·",
            pi: "π",
            alpha: "α",
            beta: "β",
            theta: "θ",
            leq: "≤",
            geq: "≥",
            neq: "≠",
            infty: "∞",
          };
          children.push({ kind: "text", text: symbols[command] ?? `\\${command}` });
        }
      } else children.push({ kind: "text", text: character });
    }
    return { kind: "row", children };
  }
  return row(0);
}

type Primitive =
  | { kind: "text"; x: number; y: number; size: number; text: string }
  | { kind: "line"; x: number; y: number; width: number };
export type FormulaLayout = { width: number; height: number; baseline: number; items: Primitive[] };
export const FORMULA_FONT = '"Cambria Math", "STIX Two Math", serif';

/** Geometria compartilhada entre preview SVG e exportação Canvas, em unidades de fonte. */
export function layoutNotebookFormula(node: FormulaNode): FormulaLayout {
  function move(layout: FormulaLayout, x: number, y: number, scale = 1): Primitive[] {
    return layout.items.map((item) =>
      item.kind === "text"
        ? { ...item, x: x + item.x * scale, y: y + item.y * scale, size: item.size * scale }
        : { ...item, x: x + item.x * scale, y: y + item.y * scale, width: item.width * scale },
    );
  }
  if (node.kind === "text")
    return {
      width: node.text.length * 0.65,
      height: 1.2,
      baseline: 0.9,
      items: [{ kind: "text", text: node.text, x: 0, y: 0.9, size: 1 }],
    };
  if (node.kind === "fraction") {
    const top = layoutNotebookFormula(node.top),
      bottom = layoutNotebookFormula(node.bottom);
    const width = Math.max(top.width, bottom.width) * 0.85 + 0.3;
    const bar = top.height * 0.85 + 0.12;
    return {
      width,
      height: bar + 0.2 + bottom.height * 0.85,
      baseline: bar + 0.28,
      items: [
        ...move(top, (width - top.width * 0.85) / 2, 0, 0.85),
        { kind: "line", x: 0, y: bar, width },
        ...move(bottom, (width - bottom.width * 0.85) / 2, bar + 0.2, 0.85),
      ],
    };
  }
  if (node.kind === "root") {
    const body = layoutNotebookFormula(node.body);
    return {
      width: body.width + 0.8,
      height: body.height + 0.14,
      baseline: body.baseline + 0.14,
      items: [
        { kind: "text", text: "√", x: 0, y: body.baseline + 0.14, size: 1 },
        { kind: "line", x: 0.65, y: 0.08, width: body.width + 0.15 },
        ...move(body, 0.8, 0.14),
      ],
    };
  }
  if (node.kind === "script") {
    const body = layoutNotebookFormula(node.body);
    const offset = node.raised ? 0 : 0.6;
    return {
      width: body.width * 0.65,
      height: body.height * 0.65 + offset,
      baseline: node.raised ? body.baseline * 0.65 + 0.45 : 0.9,
      items: move(body, 0, offset, 0.65),
    };
  }
  const children = node.children.map(layoutNotebookFormula);
  const baseline = Math.max(0.9, ...children.map((child) => child.baseline));
  let width = 0;
  const items = children.flatMap((child) => {
    const result = move(child, width, baseline - child.baseline);
    width += child.width;
    return result;
  });
  return {
    width: Math.max(width, 0.1),
    height: Math.max(1.2, ...children.map((child) => baseline - child.baseline + child.height)),
    baseline,
    items,
  };
}

export function drawNotebookFormula(
  context: CanvasRenderingContext2D,
  source: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const layout = layoutNotebookFormula(parseNotebookFormula(source));
  const size = Math.min(width / layout.width, height / layout.height);
  context.save();
  context.translate(x, y + Math.max(0, (height - layout.height * size) / 2));
  context.textBaseline = "alphabetic";
  for (const item of layout.items) {
    if (item.kind === "text") {
      context.font = `${size * item.size}px ${FORMULA_FONT}`;
      context.fillText(item.text, item.x * size, item.y * size);
    } else {
      context.fillRect(item.x * size, item.y * size, item.width * size, Math.max(1, size * 0.045));
    }
  }
  context.restore();
}
