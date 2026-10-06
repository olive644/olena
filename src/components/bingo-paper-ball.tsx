import { PAPER_BALL_FACES } from "./bingo-paper-geometry";

export function PaperBallSkin({ number }: { number: string }) {
  return (
    <svg className="bingo-ball-skin" viewBox="0 0 100 100" aria-hidden="true">
      {PAPER_BALL_FACES.map((face, i) => (
        <polygon
          key={i}
          points={face.points.map((point) => point.join(",")).join(" ")}
          fill={`var(--ball-${face.tone})`}
        />
      ))}
      <path
        d="m18 13 11 14M70 7 53 24M100 51 78 40M69 96l3-28M14 83l17-15"
        stroke="#fff9ef"
        strokeOpacity=".3"
        strokeWidth=".8"
      />
      <g fill="#292432" textAnchor="middle" fontFamily="Manrope, system-ui" fontWeight="800">
        <text x="49" y="39" fontSize="12">
          {["B", "I", "N", "G", "O"][Math.floor((Number(number) - 1) / 15)]}
        </text>
        <text x="49" y="65" fontSize="30">
          {number}
        </text>
      </g>
    </svg>
  );
}
