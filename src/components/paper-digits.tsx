import "./paper-digits.css";
import { createContext, useContext, type ReactNode } from "react";

const DigitSource = createContext("/paper-digits.svg#");
export function PaperDigitsSource({ source, children }: { source: string; children: ReactNode }) {
  return <DigitSource value={source}>{children}</DigitSource>;
}

export function PaperDigits({ value }: { value: string }) {
  const source = useContext(DigitSource);
  return (
    <span className="paper-digits">
      <span className="visually-hidden">{value}</span>
      {[...value].map((character, index) =>
        character === ":" ? (
          <span key={index} className="paper-digits__colon" aria-hidden="true" />
        ) : (
          <svg key={index + character} viewBox="0 0 66 98" aria-hidden="true">
            <use href={`${source}digit-${character}`} />
          </svg>
        ),
      )}
    </span>
  );
}
