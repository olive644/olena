import { uiText, useLanguage } from "../i18n/runtime";
import "./helena-loading.css";

type HelenaLoadingProps = {
  label?: string;
  compact?: boolean;
};

export function HelenaLoading({ label = uiText(398), compact = false }: HelenaLoadingProps) {
  useLanguage();

  return (
    <div
      className={`helena-loading${compact ? " helena-loading--compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      {/* Adapted from Uiverse.io by gustavofusco, supplied by the project owner. */}
      <svg className="helena-pencil" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <circle
          className="helena-pencil__stroke"
          cx="0"
          cy="0"
          r="70"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="439.82 439.82"
        />
        <g className="helena-pencil__rotate">
          <g fill="none">
            <circle
              className="helena-pencil__body1"
              r="64"
              stroke="#7C3AED"
              strokeWidth="30"
              strokeDasharray="402.12 402.12"
            />
            <circle
              className="helena-pencil__body2"
              r="74"
              stroke="#A779EF"
              strokeWidth="10"
              strokeDasharray="464.96 464.96"
            />
            <circle
              className="helena-pencil__body3"
              r="54"
              stroke="#51259B"
              strokeWidth="10"
              strokeDasharray="339.29 339.29"
            />
          </g>
          <g className="helena-pencil__eraser">
            <g className="helena-pencil__eraser-skew">
              <path fill="#FACC15" d="M0 0H30V25L25 30H4L0 26Z" />
              <path fill="#FFE88D" d="M0 0H9L5 30H4L0 26Z" />
              <path fill="#D5A71A" d="M24 0H30V25L25 30H20Z" />
              <path fill="#FFF9EF" d="M0 0H30V20H0Z" />
              <path fill="#C9BBA2" d="M0 0H6V20H0ZM22 0H30V20H22Z" />
              <path fill="#51465D" d="M0 6H30V8H0ZM0 13H30V15H0Z" />
            </g>
          </g>
          <g className="helena-pencil__point">
            <path fill="#F1D8A7" d="M15 0 30 30H0Z" />
            <path fill="#C9A56F" d="M15 0 7 30H0Z" />
            <path fill="#FFF9EF" d="M15 0 30 30H22Z" />
            <path fill="#292432" d="M15 0 20 10H10Z" />
          </g>
        </g>
      </svg>
      <span>{label}</span>
    </div>
  );
}
