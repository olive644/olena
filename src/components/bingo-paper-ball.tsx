import { PAPER_BALL_FACES, PAPER_BALL_LABEL } from "./bingo-paper-geometry";

export function PaperBallSkin() {
  return (
    <svg className="bingo-ball-skin" viewBox="0 0 100 100" aria-hidden="true">
      {PAPER_BALL_FACES.map((face, i) => (
        <polygon
          key={i}
          points={face.points.map((point) => point.join(",")).join(" ")}
          fill={`var(--ball-${face.tone})`}
        />
      ))}
      <polygon points="32,34 53,30 73,44 71,66 49,77 30,66 25,49" fill="var(--ball-shade)" />
      <polygon points={PAPER_BALL_LABEL.map((point) => point.join(",")).join(" ")} fill="#fff9ef" />
      <path
        d="m18 13 11 14M70 7 53 24M100 51 78 40M69 96l3-28M14 83l17-15"
        stroke="#fff9ef"
        strokeOpacity=".3"
        strokeWidth=".8"
      />
    </svg>
  );
}
