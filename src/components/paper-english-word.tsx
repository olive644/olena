import { useId } from "react";
import { PAPER_LETTER_PATHS } from "../data/paper-letter-paths";

export function PaperEnglishWord({ value }: { value: string }) {
  const letters = [...value.toUpperCase()];
  const flagId = useId();
  const glyphId = `${flagId}-glyphs`;
  const width = letters.length * 62 + 4;
  const glyphs = letters.map((letter, index) => (
    <g key={index} transform={`translate(${index * 62} 0)`}>
      <path
        d={PAPER_LETTER_PATHS[letter]}
        fill="var(--digit-depth)"
        fillRule="evenodd"
        transform="translate(3 5)"
      />
      <path d={PAPER_LETTER_PATHS[letter]} fill="var(--digit-face)" fillRule="evenodd" />
    </g>
  ));
  return (
    <span className="paper-english-word">
      <span className="visually-hidden">{value}</span>
      <svg
        viewBox={`0 0 ${width} 98`}
        style={{ width: `${letters.length * 0.62 + 0.04}em` }}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <g id={glyphId}>{glyphs}</g>
        </defs>
        <g
          className="paper-english-word__outline"
          stroke="#FFF9EF"
          strokeWidth="28"
          strokeLinejoin="round"
        >
          <use href={`#${glyphId}`} />
        </g>
        <g
          className="paper-english-word__outline"
          stroke="#A779EF"
          strokeWidth="20"
          strokeLinejoin="round"
        >
          <use href={`#${glyphId}`} />
        </g>
        <use href={`#${glyphId}`} />
      </svg>
    </span>
  );
}
