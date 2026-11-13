import {
  FORMULA_FONT,
  layoutNotebookFormula,
  parseNotebookFormula,
} from "./notebook-formula-format";

export function NotebookFormulaPreview({ source }: { source: string }) {
  const layout = layoutNotebookFormula(parseNotebookFormula(source));
  return (
    <output className="notebook-formula-preview" aria-label={source}>
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={source}
        style={{ fontFamily: FORMULA_FONT }}
      >
        {layout.items.map((item, index) =>
          item.kind === "text" ? (
            <text key={index} x={item.x} y={item.y} fontSize={item.size}>
              {item.text}
            </text>
          ) : (
            <rect key={index} x={item.x} y={item.y} width={item.width} height={0.045} />
          ),
        )}
      </svg>
    </output>
  );
}
