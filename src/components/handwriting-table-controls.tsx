import { HandwritingToolTips } from "./handwriting-tool-tips";
import { uiText, useLanguage } from "../i18n/runtime";
import {
  tableAddRow,
  tableRemoveRow,
  tableAddColumn,
  tableRemoveColumn,
} from "./handwriting-geometry";

export function HandwritingTableControls({
  cells,
  onChange,
  onRemember,
  className = "handwriting-sticky__table-controls",
}: {
  cells: string[][];
  onChange: (cells: string[][]) => void;
  onRemember: () => void;
  className?: string;
}) {
  useLanguage();
  const actions = [
    { label: 275, text: 276, disabled: cells.length >= 8, update: tableAddRow },
    { label: 277, text: 278, disabled: cells.length <= 1, update: tableRemoveRow },
    { label: 279, text: 280, disabled: (cells[0]?.length ?? 1) >= 6, update: tableAddColumn },
    { label: 281, text: 282, disabled: (cells[0]?.length ?? 1) <= 1, update: tableRemoveColumn },
  ];
  return (
    <HandwritingToolTips className={className} label={uiText(274)} role="group">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className="secondary-button"
          aria-label={uiText(action.label)}
          disabled={action.disabled}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            onRemember();
            onChange(action.update(cells));
          }}
        >
          {uiText(action.text)}
        </button>
      ))}
    </HandwritingToolTips>
  );
}
