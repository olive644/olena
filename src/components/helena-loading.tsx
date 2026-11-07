import { uiText, useLanguage } from "../i18n/runtime";
import "./helena-loading.css";

type HelenaLoadingProps = {
  label?: string;
  compact?: boolean;
  variant?: "default" | "refresh";
};

export function HelenaLoading({
  label = uiText(398),
  compact = false,
  variant = "default",
}: HelenaLoadingProps) {
  useLanguage();

  return (
    <div
      className={`helena-loading${compact ? " helena-loading--compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      {variant === "refresh" ? (
        <img
          className="helena-refresh-book"
          src="/pull-to-refresh.svg"
          alt=""
          width="64"
          height="48"
        />
      ) : (
        <>
          {/* Adapted from Uiverse.io by gustavofusco, supplied by the project owner. */}
          <img
            className="helena-pencil"
            src="/helena-pencil-loading.svg"
            alt=""
            width="160"
            height="160"
          />
        </>
      )}
      <span>{label}</span>
    </div>
  );
}
