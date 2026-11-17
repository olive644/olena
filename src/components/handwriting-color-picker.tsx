import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { uiText } from "../i18n/runtime";
import { PaperCloseIcon } from "./paper-close-icon";

export function hexToHsv(hex: string) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = rgb;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h =
    d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}
export function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return "#" + f(5) + f(3) + f(1);
}
export function HandwritingColorPicker({
  color,
  anchor,
  onChange,
  onClose,
}: {
  color: string;
  anchor: RefObject<HTMLButtonElement | null>;
  onChange(color: string): void;
  onClose(): void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [hex, setHex] = useState(color);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  useEffect(() => {
    setHex(color);
    setHsv((old) => {
      const next = hexToHsv(color);
      return next.s === 0 ? { ...next, h: old.h } : next;
    });
  }, [color]);
  useEffect(() => {
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const p = panel.current;
      if (!a || !p) return;
      const left =
        a.right + 12 + p.offsetWidth <= window.innerWidth - 8
          ? a.right + 12
          : a.left - p.offsetWidth - 12;
      setPosition({
        left: Math.max(8, Math.min(left, window.innerWidth - p.offsetWidth - 8)),
        top: Math.max(8, Math.min(a.top, window.innerHeight - p.offsetHeight - 8)),
      });
    };
    const dismiss = (e: PointerEvent) => {
      if (
        e.target instanceof Node &&
        !panel.current?.contains(e.target) &&
        !anchor.current?.contains(e.target)
      )
        onClose();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        anchor.current?.focus();
      }
    };
    place();
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("keydown", escape, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, onClose]);
  function apply(h: number, s: number, v: number) {
    setHsv({ h, s, v });
    onChange(hsvToHex(h, s, v));
  }
  function point(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 450) % 360;
    apply(h, Math.min(1, Math.hypot(dx, dy)), hsv.v);
  }
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return createPortal(
    <div
      ref={panel}
      className="olena-color-picker"
      role="dialog"
      aria-label={uiText("Cor da tinta")}
      style={position}
    >
      <header>
        <strong>{uiText("Cor da tinta")}</strong>
        <button type="button" aria-label={uiText("Fechar painel de cores")} onClick={onClose}>
          <PaperCloseIcon />
        </button>
      </header>
      <div
        className="olena-color-picker__plane"
        role="slider"
        tabIndex={0}
        aria-label={uiText("Matiz e saturação")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        aria-valuetext={Math.round(hsv.h) + "° / " + Math.round(hsv.s * 100) + "%"}
        style={{
          backgroundImage:
            "radial-gradient(circle closest-side, #fff, transparent), conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.focus();
          e.currentTarget.setPointerCapture(e.pointerId);
          point(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) point(e);
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
          e.preventDefault();
          apply(
            (hsv.h + (e.key === "ArrowRight" ? 2 : e.key === "ArrowLeft" ? -2 : 0) + 360) % 360,
            Math.max(
              0,
              Math.min(1, hsv.s + (e.key === "ArrowUp" ? 0.01 : e.key === "ArrowDown" ? -0.01 : 0)),
            ),
            hsv.v,
          );
        }}
      >
        <i
          style={{
            left: 50 + Math.sin((hsv.h * Math.PI) / 180) * hsv.s * 50 + "%",
            top: 50 - Math.cos((hsv.h * Math.PI) / 180) * hsv.s * 50 + "%",
            backgroundColor: color,
          }}
        />
      </div>
      <label className="olena-color-picker__hue olena-color-picker__brightness">
        <span className="visually-hidden">{uiText("Brilho")}</span>
        <input
          aria-label={uiText("Brilho")}
          type="range"
          min={0}
          max={100}
          style={{ background: `linear-gradient(to right, #000, ${hsvToHex(hsv.h, hsv.s, 1)})` }}
          value={Math.round(hsv.v * 100)}
          onChange={(e) => apply(hsv.h, hsv.s, Number(e.target.value) / 100)}
        />
      </label>
      <div className="olena-color-picker__values">
        <span
          className="olena-color-picker__sample"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <label>
          HEX
          <input
            aria-label="HEX"
            value={hex}
            maxLength={7}
            spellCheck={false}
            onChange={(e) => {
              const value = e.target.value;
              setHex(value);
              if (/^#[0-9a-f]{6}$/i.test(value)) onChange(value.toLowerCase());
            }}
            onBlur={() => setHex(color)}
          />
        </label>
      </div>
      <div className="olena-color-picker__rgb">
        {["R", "G", "B"].map((label, i) => (
          <label key={label}>
            {label}
            <input
              type="number"
              min={0}
              max={255}
              aria-label={label}
              value={rgb[i]}
              onChange={(e) => {
                if (e.target.value === "") return;
                const next = [...rgb];
                next[i] = Math.max(0, Math.min(255, Math.round(Number(e.target.value))));
                onChange("#" + next.map((v) => v.toString(16).padStart(2, "0")).join(""));
              }}
            />
          </label>
        ))}
      </div>
    </div>,
    document.body,
  );
}
