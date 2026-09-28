import "./paper-digits.css";

export function PaperDigits({ value }: { value: string }) {
  return (
    <span className="paper-digits">
      <span className="visually-hidden">{value}</span>
      {[...value].map((character, index) =>
        character === ":" ? (
          <span key={index} className="paper-digits__colon" aria-hidden="true" />
        ) : (
          <svg key={index} viewBox="0 0 66 98" aria-hidden="true">
            <use href={`/paper-digits.svg#digit-${character}`} />
          </svg>
        ),
      )}
    </span>
  );
}
