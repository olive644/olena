import { PaperDigits } from "./paper-digits";

export function MathNumber({ value }: { value: number }) {
  const text = Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(2))).replace(".", ",");
  return (
    <span className="math-number" aria-label={text}>
      {text
        .split(/([0-9]+)/)
        .filter(Boolean)
        .map((part, index) =>
          /^[0-9]+$/.test(part) ? (
            <PaperDigits key={index} value={part} />
          ) : (
            <span key={index} aria-hidden="true">
              {part}
            </span>
          ),
        )}
    </span>
  );
}
export function MathExpression({ value }: { value: string }) {
  return (
    <span className="math-expression" aria-hidden="true">
      {value
        .split(/([0-9]+|\?)/)
        .filter(Boolean)
        .map((part, index) =>
          /^[0-9]+$/.test(part) ? (
            <PaperDigits key={index} value={part} />
          ) : part === "?" ? (
            <MathQuestionMark key={index} />
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
    </span>
  );
}
export function MathQuestionMark() {
  return (
    <svg className="math-question-mark" viewBox="0 0 66 98" aria-hidden="true">
      <path
        d="M9 22 19 7h29l12 12v25L40 60v10H23V51l20-17V24H27v12H9Zm14 59h17v17H23Z"
        fill="#aa802a"
      />
      <path
        d="M6 18 16 3h29l12 12v25L37 56v10H20V47l20-17V20H24v12H6Zm14 59h17v17H20Z"
        fill="#f9ce61"
      />
      <path d="m6 18 10-15h29l-5 17H24v12H6Zm14 59h17l-6 7H20Z" fill="#ffe8a0" />
    </svg>
  );
}
export function MathActionIcon({ retry = false }: { retry?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="math-action-icon">
      <path d="m12 7 39 0 5 7v43H12l-5-6V14Z" fill="#14546b" />
      <path d="M12 7h39v43H12Z" fill="#8ce0df" />
      <path d="m12 7 39 0-7 6H18v37h-6Z" fill="#d5f6e6" />
      <path d="M20 17h22v10H20Z" fill="#153f54" />
      {retry ? (
        <>
          <path d="M39 39a11 11 0 1 0-8 13v-6a5 5 0 1 1 3-7h-7l10 10 10-10Z" fill="#f7c748" />
        </>
      ) : (
        <>
          <path d="M20 34h7v7h-7Zm12 0h7v7h-7ZM20 45h7v7h-7Z" fill="#fff6d4" />
          <path d="m46 26 5 10 11 2-8 8 1 12-10-6-10 6 2-12-8-8 11-2Z" fill="#fbd34d" />
          <path d="m46 26 0 21-17-9 11-2Z" fill="#ffe9a1" />
        </>
      )}
    </svg>
  );
}
export function MathHeart() {
  return (
    <svg viewBox="0 0 50 48" aria-hidden="true">
      <path d="m25 10 10-8 12 7v16L25 47 3 25V9l12-7Z" fill="#ad344e" />
      <path d="m25 7 10-7 12 6v16L25 43 3 22V6l12-6Z" fill="#fb7a83" />
      <path d="m3 6 12-6 10 7v12L9 13Z" fill="#ffc3a6" />
      <path d="m25 19 22 3-22 21Z" fill="#d44a65" />
    </svg>
  );
}
export function MathFlame() {
  return (
    <svg className="math-flame" viewBox="0 0 48 56" aria-hidden="true">
      <path d="m25 0 6 21 10-6 6 19-8 17-16 5L5 47 0 32l13-17 2 13Z" fill="#ea6841" />
      <path d="m25 0-10 28 15 8 1-15Z" fill="#ffc453" />
      <path d="m23 25 13 18-10 10-12-9Z" fill="#fff1ac" />
    </svg>
  );
}
export function OliverMathGuide({
  mood = "ready",
}: {
  mood?: "ready" | "correct" | "wrong" | "finished";
}) {
  return (
    <div
      className={`oliver-math-guide is-${mood}`}
      aria-label="Oliver, seu companheiro de Matemática"
      role="img"
    >
      <svg viewBox="0 0 220 240" aria-hidden="true">
        <path d="m65 143 70-9 31 39-18 36-82 0-25-26Z" fill="#248baa" />
        <path d="m65 143 70-9-15 43-54 32-25-26Z" fill="#8fd8dd" />
        <path d="m73 205 20 0 2 25-36 7-15-10Zm49 0h22l26 21-9 11-39-7Z" fill="#195d82" />
        <path d="m46 153-25 5-14 35 24 9 21-23Zm108-5 34 5 16 32-24 13-27-26Z" fill="#58c3d2" />
        <path d="m11 186 23 4-3 12-24-9Zm175-19 27 3-5 45-29-3Z" fill="#f5c64f" />
        <path d="m186 167 8 8 19-5-5 45-9-6 5-35Z" fill="#fff1a6" />
      </svg>
      <img src="/profile-avatars/oliver.webp" alt="" />
    </div>
  );
}
