import { uiText, useLanguage } from "../i18n/runtime";
import { PaperBallSkin } from "./bingo-paper-ball";
import { paperBallStyle } from "./bingo-ball-palette";

export function BingoLatest({ number }: { number: string | undefined }) {
  useLanguage();

  if (!number) return null;
  const letter = ["B", "I", "N", "G", "O"][Math.floor((Number(number) - 1) / 15)];
  return (
    <div className="bingo-latest" role="status" aria-label={uiText(1620, [letter, number])}>
      <span className="bingo-participant-ball" style={paperBallStyle(number)} aria-hidden="true">
        <PaperBallSkin number={number} />
      </span>
      <span>
        <small>{uiText(127)}</small>
        <strong>
          {letter} {number}
        </strong>
      </span>
    </div>
  );
}
