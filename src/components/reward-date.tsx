import { uiLocale, uiText } from "../i18n/runtime";
import { PaperDigits } from "./paper-digits";

export function RewardDate({
  at,
  showTime = false,
}: {
  at?: string | number | undefined;
  showTime?: boolean;
}) {
  const date = at === undefined ? undefined : new Date(at);
  if (!date || !Number.isFinite(date.getTime()))
    return <span>{uiText("Data não registrada")}</span>;
  const label = new Intl.DateTimeFormat(uiLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(showTime ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(date);
  return (
    <time className="reward-date" dateTime={date.toISOString()} aria-label={label}>
      <span aria-hidden="true">
        {label
          .split(/(\d+)/)
          .filter(Boolean)
          .map((part, index) =>
            /^\d+$/.test(part) ? (
              <PaperDigits key={index} value={part} />
            ) : (
              <span key={index}>{part}</span>
            ),
          )}
      </span>
    </time>
  );
}
