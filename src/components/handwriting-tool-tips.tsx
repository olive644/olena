import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function HandwritingToolTips({
  className,
  label,
  role,
  children,
}: {
  className: string;
  label: string;
  role?: "group";
  children: ReactNode;
}) {
  const [tip, setTip] = useState<{ label: string; x: number; y: number }>();
  function showTip(target: EventTarget) {
    const button =
      target instanceof Element ? target.closest("button[aria-label], summary[aria-label]") : null;
    const label = button?.getAttribute("aria-description") || button?.getAttribute("aria-label");
    if (!button || !label || button.hasAttribute("data-no-tooltip")) return;
    const bounds = button.getBoundingClientRect();
    setTip({ label, x: bounds.left + bounds.width / 2, y: bounds.bottom + 10 });
  }

  return (
    <div
      className={className}
      role={role}
      aria-label={label}
      onPointerOver={(event) => {
        if (event.pointerType === "mouse") showTip(event.target);
      }}
      onPointerLeave={() => setTip(undefined)}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) showTip(event.target);
      }}
      onBlur={() => setTip(undefined)}
      onScroll={() => setTip(undefined)}
      onClick={() => setTip(undefined)}
    >
      {tip &&
        createPortal(
          <span
            aria-hidden="true"
            className="handwriting-tool-tip"
            style={{ left: tip.x, top: tip.y }}
          >
            {tip.label}
          </span>,
          document.querySelector(".capture-dialog--handwriting") ?? document.body,
        )}
      {children}
    </div>
  );
}
