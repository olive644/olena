export function PaperEnglishWord({ value }: { value: string }) {
  const letters = [...value.toUpperCase()];
  return (
    <span className="paper-english-word">
      <span className="visually-hidden">{value}</span>
      <svg
        viewBox={`0 0 ${letters.length * 62 + 4} 98`}
        style={{ width: `${letters.length * 0.62 + 0.04}em` }}
        aria-hidden="true"
        focusable="false"
      >
        {letters.map((letter, index) => (
          <use
            key={index}
            href={`/paper-monochrome-alphabet.svg#letter-${letter}`}
            x={index * 62}
            width="66"
            height="98"
          />
        ))}
      </svg>
    </span>
  );
}
