import { PaperDigits } from "../components/paper-digits";
import { useEffect, useState, type CSSProperties } from "react";
import type { HelenaUsage } from "../data/helena-client";
import { countdownParts, creditLevel, dayElapsedShare } from "../domain/olena-credits";
import { uiText } from "../i18n/runtime";
import type { CreditSpend } from "./use-olena-credits";
import "./olena-credits.css";

const nowMs = () => Date.now();
const STEPS = 16;
const STEP_MS = 55;

function duration(seconds: number): string {
  const { hours, minutes } = countdownParts(seconds);
  if (hours === 0 && minutes <= 1) return uiText("menos de 1 min");
  if (hours === 0) return uiText("{0} min", [String(minutes)]);
  return uiText("{0} h {1} min", [String(hours), String(minutes)]);
}

export function OlenaCreditMeter({
  usage,
  resetAt,
  spend,
  compact = false,
}: {
  compact?: boolean;
  usage: HelenaUsage | undefined;
  resetAt: number;
  spend: CreditSpend | undefined;
}) {
  const [now, setNow] = useState(nowMs);
  const [progress, setProgress] = useState({ id: 0, step: 0 });

  useEffect(() => {
    const timer = setInterval(() => setNow(nowMs()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const spendKey = spend?.id;
  const instant = spend?.instant ?? true;
  useEffect(() => {
    if (spendKey === undefined || instant) return;
    const timer = setInterval(() => {
      setProgress((current) =>
        current.id === spendKey
          ? { id: spendKey, step: Math.min(STEPS, current.step + 1) }
          : { id: spendKey, step: 1 },
      );
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [spendKey, instant]);

  if (!usage) return null;

  const step = spend && !spend.instant ? (progress.id === spend.id ? progress.step : 0) : STEPS;
  const shown =
    spend && step < STEPS
      ? Math.round(spend.from + ((spend.to - spend.from) * step) / STEPS)
      : usage.remainingCredits;
  const secondsLeft = Math.max(0, Math.round((resetAt - now) / 1000));
  const level = creditLevel(usage.remainingCredits, usage.requestMaxCredits);
  const share = usage.limitCredits > 0 ? Math.min(1, shown / usage.limitCredits) : 0;
  const clock = new Date(resetAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const when = [duration(secondsLeft), clock];

  return (
    <div
      className={`olena-credits${compact ? " olena-credits--compact" : ""}`}
      data-level={level}
      role="group"
      aria-label={uiText("Créditos da Olena")}
    >
      <span className="olena-credits-gem" aria-hidden="true" />
      <div className="olena-credits-main">
        <p className="olena-credits-line">
          <strong>{uiText("Créditos da Olena")}</strong>
          <span className="olena-credits-count">
            <b>{compact ? <PaperDigits value={String(shown)} /> : shown}</b>
            <span> / {usage.limitCredits}</span>
          </span>
        </p>
        <span className="olena-credits-track" aria-hidden="true">
          <span style={{ width: `${Math.round(share * 100)}%` }} />
        </span>
        <p className="olena-credits-reset">
          <span className="olena-credits-clock" aria-hidden="true">
            <span style={{ width: `${Math.round(dayElapsedShare(secondsLeft) * 100)}%` }} />
          </span>
          {level === "empty"
            ? uiText("Os créditos de hoje acabaram. Renovam em {0}, às {1}.", when)
            : level === "low"
              ? uiText("Pouco saldo para um pedido grande. Renova em {0}, às {1}.", when)
              : uiText("Renova em {0}, às {1}.", when)}
        </p>
      </div>
      {spend && (
        <span key={spend.id} className="olena-credits-burst" aria-hidden="true">
          <span className="olena-credits-spent">
            {"−"}
            {spend.amount}
          </span>
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <i key={index} style={{ "--spark": index } as CSSProperties} />
          ))}
        </span>
      )}
      <span className="visually-hidden" role="status">
        {spend ? uiText("Gastou {0} créditos.", [String(spend.amount)]) : ""}
      </span>
    </div>
  );
}
