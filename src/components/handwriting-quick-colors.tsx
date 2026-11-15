import { useEffect, useRef, useState } from "react";
import { uiText } from "../i18n/runtime";
import {
  normalizeHex,
  readRecentColors,
  rememberRecentColor,
  sampleCanvasStack,
  writeRecentColors,
} from "./handwriting-quick-colors-model";

type HandwritingQuickColorsProps = {
  color: string;
  onColorChange: (color: string) => void;
};

// Cores fixas sempre à mão; as mesmas do painel de tinta.
const FIXED_COLORS = [
  ["#17151c", 1573],
  ["#7c3aed", 1568],
  ["#ef476f", 1570],
  ["#2d8a67", 1571],
  ["#facc15", 1569],
  ["#fff9ef", 1641],
] as const;
const FIXED_HEX: readonly string[] = FIXED_COLORS.map(([hex]) => hex);

// Barra de cores sempre visível com caneta ou marca-texto: cores fixas, as personalizadas usadas
// por último (guardadas só neste aparelho), seletor livre e conta-gotas que lê a cor da própria folha.
export function HandwritingQuickColors({ color, onColorChange }: HandwritingQuickColorsProps) {
  const [recent, setRecent] = useState<string[]>(readRecentColors);
  const [picking, setPicking] = useState(false);
  const [message, setMessage] = useState("");
  const current = normalizeHex(color) ?? color;
  const changeRef = useRef(onColorChange);
  useEffect(() => {
    changeRef.current = onColorChange;
  }, [onColorChange]);

  // O seletor nativo dispara a cada arrasto: só lembra a cor depois que ela assenta.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecent((list) => {
        const next = rememberRecentColor(list, current, FIXED_HEX);
        if (next.join() === list.join()) return list;
        writeRecentColors(next);
        return next;
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [current]);

  // Com o conta-gotas ligado, o próximo toque na folha escolhe a cor e não desenha nada.
  useEffect(() => {
    if (!picking) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const shell = target?.closest(".handwriting-page-shell");
      if (!shell) {
        setPicking(false);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const picked = sampleCanvasStack(
        Array.from(shell.querySelectorAll("canvas")),
        event.clientX,
        event.clientY,
      );
      setPicking(false);
      if (!picked) return;
      changeRef.current(picked);
      setMessage(uiText(3878, [picked]));
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setPicking(false);
    }
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [picking]);

  const swatches: [string, string][] = [
    ...FIXED_COLORS.map(([hex, label]) => [hex, uiText(1642, [uiText(label)])] as [string, string]),
    ...recent.map((hex) => [hex, uiText(1642, [hex])] as [string, string]),
  ];
  return (
    <div
      className="handwriting-quick-colors"
      role="group"
      aria-label={uiText(3875)}
      data-picking={picking || undefined}
    >
      {swatches.map(([hex, label]) => (
        <button
          key={hex}
          type="button"
          className="quick-color"
          aria-label={label}
          aria-pressed={current === hex}
          style={{ backgroundColor: hex }}
          onClick={() => onColorChange(hex)}
        />
      ))}
      <label className="quick-color quick-color--custom" title={uiText(184)}>
        <span className="visually-hidden">{uiText(184)}</span>
        <input
          type="color"
          aria-label={uiText(184)}
          value={normalizeHex(color) ?? "#17151c"}
          onChange={(event) => onColorChange(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="quick-color quick-color--dropper"
        aria-label={uiText(3876)}
        title={uiText(3876)}
        aria-pressed={picking}
        onClick={() => {
          setMessage("");
          setPicking((value) => !value);
        }}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="m34 3 11 11-6 6-11-11Z" fill="#a779ef" />
          <path d="m39 14 6 0-6 6-5-5Z" fill="#7433e0" />
          <path d="m26 12 11 11-5 5-11-11Z" fill="#7433e0" />
          <path d="m21 17 11 11-16 16-6-6Z" fill="#9bdcf5" />
          <path d="m21 17 4 4-15 15 0-6Z" fill="#fff2ce" />
          <path d="m16 28 4 4-12 12-4-4Z" fill="#ffdb29" />
          <path d="m10 44-6 1 1-6Z" fill="#654237" />
        </svg>
      </button>
      {picking && <span className="quick-color-hint">{uiText(3877)}</span>}
      <span className="visually-hidden" aria-live="polite">
        {message}
      </span>
    </div>
  );
}
