import type { ReactNode } from "react";
import "../views/notebook-shelf.css";

export function NotebookShelfFrame({
  children,
  sign,
  lowerShelf,
  label,
  className = "",
}: {
  children?: ReactNode;
  sign?: ReactNode;
  lowerShelf?: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <section
      className={`notebook-display-shelf ${lowerShelf ? "has-lower-shelf" : ""} ${className}`}
      aria-label={label}
    >
      {["left", "right"].map((side) => (
        <span key={side} className={`notebook-shelf-vines is-${side}`} aria-hidden="true">
          {Array.from({ length: 16 }, (_, index) => (
            <i key={index} style={{ top: index * 12 }} />
          ))}
        </span>
      ))}

      {sign}
      <div className="notebook-display-shelf__books">
        {children}
        <img
          className="notebook-shelf-cat"
          src="/olena-shelf-sleeping.webp"
          alt=""
          draggable={false}
        />
      </div>
      {lowerShelf}
    </section>
  );
}
