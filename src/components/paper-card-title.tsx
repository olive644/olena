export function PaperCardTitle({ value }: { value: string }) {
  return (
    <span className="paper-card-title">
      <span className="visually-hidden">{value}</span>
      {value
        .toUpperCase()
        .split(" ")
        .map((word, index) => (
          <span className="paper-card-word" aria-hidden="true" key={index}>
            {[...word].map((letter, position) => {
              const [base, accent] = [...letter.normalize("NFD")];
              return (
                <svg key={position} viewBox="0 -18 66 122" focusable="false">
                  <use
                    href={`/paper-monochrome-alphabet.svg#letter-${base}`}
                    width="66"
                    height="98"
                  />
                  {accent === "\u0301" && (
                    <path fill="var(--digit-face)" d="M27 -2 38 -17H53L38 -2Z" />
                  )}
                  {accent === "\u0302" && (
                    <path fill="var(--digit-face)" d="M12 -2 25 -16H40L53 -2H38L32 -8 26 -2Z" />
                  )}
                  {accent === "\u0303" && (
                    <path
                      fill="none"
                      stroke="var(--digit-face)"
                      strokeWidth="7"
                      d="M14 -5Q24 -17 33 -8T51 -11"
                    />
                  )}
                  {accent === "\u0327" && (
                    <path fill="var(--digit-face)" d="M29 90H38L34 95H41L37 103H22L25 97H31Z" />
                  )}
                </svg>
              );
            })}
          </span>
        ))}
    </span>
  );
}
