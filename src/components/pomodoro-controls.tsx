import { useId, useState, type ReactNode } from "react";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { PaperEditorIcon } from "./paper-editor-icon";
import { uiText } from "../i18n/runtime";

export function PomodoroControls({
  label,
  icon,
  finishDisabled,
  onToggle,
  onReset,
  onFinish,
  collapsible = false,
}: {
  label: string;
  icon: ReactNode;
  finishDisabled: boolean;
  onToggle(): void;
  onReset(): void;
  onFinish(): void;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <div className="pomodoro-controls">
      {collapsible && (
        <button
          className="focus-mode-arrow pomodoro-controls__toggle"
          type="button"
          aria-label={uiText(expanded ? 2786 : 2787)}
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
        >
          <FocusPaperArrow />
        </button>
      )}
      <div
        className="timer-controls pomodoro-controls__row"
        id={id}
        hidden={collapsible && !expanded}
      >
        <button className="primary-button timer-primary" type="button" onClick={onToggle}>
          {icon}
          {label}
        </button>
        <button className="icon-button" type="button" onClick={onReset} aria-label={uiText(1173)}>
          <PaperEditorIcon name="reset" />
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={onFinish}
          disabled={finishDisabled}
        >
          {uiText(1174)}
        </button>
      </div>
    </div>
  );
}
