import "./library-typewriter.css";
import { useId } from "react";
import type { LibraryFolderStyle } from "../domain/workspace";
/** Carriage motion inspired by Nawsome's Uiverse typewriter; original paper-cut artwork. */
export function LibraryTypewriter({ style = "classic" }: { style?: LibraryFolderStyle }) {
  const clip = useId();
  return (
    <svg
      data-typewriter-style={style}
      className="library-typewriter"
      viewBox="0 0 180 150"
      aria-hidden="true"
    >
      <g className="library-typewriter-carriage">
        <path d="M38 14h80l14 13v66H38Z" fill="#fff9ef" />
        <path d="m118 14 14 13h-14Z" fill="#d5c19e" />
        <path d="M51 34h55v4H51Zm0 12h65v4H51Zm0 12h43v4H51Z" fill="#bda78e" />
        <path d="M21 76h126v17H21Z" fill="#49324f" />
        <path d="M21 76h126v6H21Z" fill="#877194" />
        <path d="M12 72h10v25H12Zm135 0h12v25h-12Z" fill="#e8b65c" />
        <path d="M4 67h9v5h18v5H4Z" fill="#ffe597" />
      </g>
      <path d="M23 86h130l20 49-9 10H12l-8-10Z" fill="#7445b4" />
      {style !== "classic" && (
        <>
          <defs>
            <clipPath id={clip}>
              <path d="M23 86h130l20 49-9 10H12l-8-10Z" />
            </clipPath>
          </defs>
          <g clipPath={"url(#" + clip + ")"}>
            {["blood-moon", "solar-eclipse", "lunar-eclipse"].includes(style) ? (
              <>
                <path
                  d="M4 86h170v60H4Z"
                  fill={
                    style === "blood-moon"
                      ? "#592333"
                      : style === "solar-eclipse"
                        ? "#252333"
                        : "#30335a"
                  }
                />
                <circle
                  cx="91"
                  cy="116"
                  r="27"
                  fill={
                    style === "blood-moon"
                      ? "#d3514f"
                      : style === "solar-eclipse"
                        ? "#facc15"
                        : "#c6b6ee"
                  }
                />
                <path
                  d="m91 89 20 10-12 20-25 10-10-15Z"
                  fill={style === "blood-moon" ? "#983344" : "#8a75b1"}
                />
                {style !== "blood-moon" && (
                  <circle
                    cx={style === "solar-eclipse" ? 91 : 109}
                    cy="112"
                    r="23"
                    fill="#252333"
                  />
                )}
              </>
            ) : style === "pride" ? (
              ["#ef5656", "#f59732", "#facc15", "#439e76", "#4f91ce", "#9e60cf"].map((color, i) => (
                <path key={color} d={"M4 " + (86 + i * 10) + "h170v10H4Z"} fill={color} />
              ))
            ) : style === "english" ? (
              <>
                <path d="M4 86h170v60H4Z" fill="#365d9d" />
                <path d="m4 86 170 60m0-60L4 146" stroke="#fff2ce" strokeWidth="14" />
                <path d="m4 86 170 60m0-60L4 146" stroke="#dc6273" strokeWidth="5" />
                <path d="M88 86v60M4 116h170" stroke="#fff2ce" strokeWidth="20" />
                <path d="M88 86v60M4 116h170" stroke="#d74960" strokeWidth="10" />
              </>
            ) : (
              <>
                <path d="M4 86h170v60H4Z" fill="#258b7c" />
                <path
                  d="M19 94h140M13 109h150M8 124h160M29 86v60m28-60v60m28-60v60m28-60v60m28-60v60"
                  stroke="#6ac8ad"
                  strokeWidth="1"
                />
                <path d="M17 131h12m-6-6v12m113-5h14m-14 6h14" stroke="#fff2ce" strokeWidth="3" />
              </>
            )}
          </g>
        </>
      )}
      <path d="m23 86 14 12h102l14-12Z" fill="#bd95ef" />
      <path d="m139 98 14-12 20 49-9 10h-14Z" fill="#49316d" />
      <path d="m4 135 8 10h152l9-10Z" fill="#352447" />
      <path d="M32 102h111l9 26H23Z" fill="#30263b" />
      {[0, 1, 2].map((row) => (
        <g key={row} className="library-typewriter-keys">
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              d={
                "M" +
                (34 + i * 13 - row * 2) +
                " " +
                (105 + row * 7) +
                "h9l2 4H" +
                (33 + i * 13 - row * 2) +
                "Z"
              }
              fill={row === 1 && i === 3 ? "#facc15" : "#fff2ce"}
            />
          ))}
        </g>
      ))}
      <path d="M55 130h69v5H55Z" fill="#e8b65c" />
      <path d="M72 90h31v8H72Z" fill="#2b8b83" />
      <path d="m72 90 6 4h25v-4Z" fill="#8fdfc3" />
    </svg>
  );
}
