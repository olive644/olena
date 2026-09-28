import type { ShapeKind } from "./handwriting-shapes";
import "./paper-object-controls.css";

type ObjectIcon = "notebook" | "note" | "folder" | "shapes" | "eraseArea" | "eraseStroke";
const outlines: Record<ShapeKind, string> = {
  line: "M8 35 39 12",
  ellipse: "M40 24C40 13 32 8 24 8S8 13 8 24s8 16 16 16 16-5 16-16Z",
  rectangle: "M8 10h32v29H8Z",
  triangle: "M24 7 42 39H6Z",
  arrow: "M7 35 38 12m-16 0h16v16",
  polygon: "M15 7h18l11 17-11 17H15L4 24Z",
};

export function PaperObjectIcon({ name }: { name: ObjectIcon | ShapeKind }) {
  const shape = name in outlines ? outlines[name as ShapeKind] : null;
  return (
    <svg
      className="paper-object-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      data-paper-object={name}
    >
      {shape ? (
        <>
          <path d={shape} fill="none" stroke="#51465D" strokeWidth="5" transform="translate(1 2)" />
          <path d={shape} fill="none" stroke="#A779EF" strokeWidth="4" strokeLinejoin="bevel" />
          <path d="M6 36h6v6H6Z" fill="#FACC15" />
        </>
      ) : name === "eraseArea" || name === "eraseStroke" ? (
        <>
          <path
            d={
              name === "eraseArea" ? "M3 35 9 28l7 4m16 0 6 3 7-8" : "M3 35 9 28l14 8 10-7 6 6 6-8"
            }
            fill="none"
            stroke={name === "eraseArea" ? "#51465D" : "#C9BDD9"}
            strokeWidth="4"
            strokeLinejoin="bevel"
          />
          <path d="m14 20 15-16 13 12-15 17Z" fill="#51259B" />
          <path d="m14 17 15-16 13 12-15 17Z" fill="#A779EF" />
          <path d="m14 17 7-8 13 12-7 9Z" fill="#FFF9EF" />
          <path d="m29 1 4 4-15 16-4-4Z" fill="#E9DAFB" />
          {name === "eraseStroke" && (
            <path d="m19 36 5 5 9-11" fill="none" stroke="#7C3AED" strokeWidth="3" />
          )}
        </>
      ) : name === "folder" ? (
        <>
          <path d="M4 10h15l5 6h20v26H4Z" fill="#A779EF" />
          <path d="M9 6h23l6 6v24H9Z" fill="#FFF9EF" />
          <path d="M3 21h42l-4 23H6Z" fill="#7C3AED" />
          <path d="M3 21h42l-8 6H4Z" fill="#A779EF" />
          <path d="m28 28 2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Z" fill="#FACC15" />
        </>
      ) : name === "shapes" ? (
        <>
          <path d="M4 24h23v21H4Z" fill="#51259B" />
          <path d="M4 21h23v21H4Z" fill="#A779EF" />
          <path d="m4 21 6 5v16H4Z" fill="#E9DAFB" />
          <path d="m32 3 14 24H18Z" fill="#FACC15" />
          <path d="m32 3-6 18-8 6Z" fill="#FFE88D" />
        </>
      ) : (
        <>
          <path d="M8 6h25l8 8v31H8Z" fill="#CABDA5" />
          <path d="M8 3h25l8 8v31H8Z" fill={name === "notebook" ? "#7C3AED" : "#FFF9EF"} />
          <path d="M33 3v10h8Z" fill={name === "notebook" ? "#A779EF" : "#E4DAC6"} />
          {name === "notebook" ? (
            <>
              <path d="M6 3h7v39H6Z" fill="#51465D" />
              <path d="M3 11h12v3H3Zm0 12h12v3H3Zm0 12h12v3H3Z" fill="#E9DAFB" />
              <path d="m27 17 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#FACC15" />
            </>
          ) : (
            <path d="M15 20h18v3H15Zm0 7h18v3H15Zm0 7h12v3H15Z" fill="#51465D" />
          )}
        </>
      )}
    </svg>
  );
}
