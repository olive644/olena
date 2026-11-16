import { uiText } from "../i18n/runtime";
import { PaperArrow } from "./paper-arrow";
import { ShelfToolIcon } from "./shelf-tool-icon";

export function ShelfEditorTools({
  editing,
  changed,
  onBack,
  onPrimary,
  onName,
  onDelete,
}: {
  editing: boolean;
  changed: boolean;
  onBack: () => void;
  onPrimary: () => void;
  onName: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="shelf-editor-tools" role="group" aria-label={uiText(3769)}>
      {editing && (
        <button className="shelf-back" aria-label={uiText(3770)} onClick={onBack}>
          <PaperArrow back />
        </button>
      )}
      <div className="shelf-editor-cluster" key={editing ? "editing" : "resting"}>
        <button
          className="shelf-wood-button"
          aria-label={uiText(editing ? 3771 : 3772)}
          disabled={editing && !changed}
          onClick={onPrimary}
        >
          <ShelfToolIcon name={editing ? "save" : "pen"} />
        </button>
        {editing && (
          <>
            <button
              className="shelf-wood-button shelf-name-tool"
              aria-label={uiText(3773)}
              onClick={onName}
            >
              <ShelfToolIcon name="text" />
              <span>{uiText(3773)}</span>
            </button>
            <button
              className="shelf-wood-button shelf-trash"
              aria-label={uiText(3774)}
              onClick={onDelete}
            >
              <ShelfToolIcon name="trash" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
