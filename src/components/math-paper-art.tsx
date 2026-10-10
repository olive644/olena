import { PaperDigits } from "./paper-digits";
import { useStoredProfile } from "../hooks/use-stored-profile";
import { PracticeUserPortrait } from "./practice-user-portrait";

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
            <MathIcon key={index} name="question" />
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
    </span>
  );
}
export function MathIcon({
  name,
}: {
  name: "question" | "start" | "retry" | "heart" | "flame" | "explore";
}) {
  return (
    <img
      className={
        name === "heart"
          ? undefined
          : name === "question"
            ? "math-question-mark"
            : name === "flame"
              ? "math-flame"
              : "math-action-icon"
      }
      src={`/math-islands/${name}.svg`}
      alt=""
      aria-hidden="true"
    />
  );
}
export function MathUserAvatar({
  mood = "ready",
}: {
  mood?: "ready" | "correct" | "wrong" | "finished";
}) {
  const [profile] = useStoredProfile();
  return (
    <div className={`math-user-avatar is-${mood}`}>
      <PracticeUserPortrait profile={profile} />
    </div>
  );
}
