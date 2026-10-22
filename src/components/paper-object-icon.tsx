import "./paper-object-controls.css";
export function PaperObjectIcon({
  name,
}: {
  name:
    | "line"
    | "ellipse"
    | "rectangle"
    | "triangle"
    | "arrow"
    | "polygon"
    | "eraseArea"
    | "eraseStroke"
    | "folder"
    | "shapes"
    | "ruler"
    | "eraseBackground"
    | "curve"
    | "space"
    | "coordinate-system"
    | "notebook"
    | "note";
}) {
  return (
    <svg
      className="paper-object-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      data-paper-object={name}
    >
      <use href={`/navigation-icons/paper/paper-object-icon.svg#${name}`} />
    </svg>
  );
}
