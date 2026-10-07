import { PaperBallSkin } from "./bingo-paper-ball";
import { paperBallStyle } from "./bingo-ball-palette";

export function BingoLatest({ number }: { number: string | undefined }) {
  if (!number) return null;
  const letter = ["B", "I", "N", "G", "O"][Math.floor((Number(number) - 1) / 15)];
  return (
    <div className="bingo-latest" role="status" aria-label={`Última bola: ${letter} ${number}`}>
      <span className="bingo-participant-ball" style={paperBallStyle(number)} aria-hidden="true">
        <PaperBallSkin number={number} />
      </span>
      <span>
        <small>Última bola</small>
        <strong>
          {letter} {number}
        </strong>
      </span>
    </div>
  );
}
