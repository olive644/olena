import { useEffect, useRef, useState } from "react";
import { playPaperAppliedSound, startPaperHoldSound } from "../data/notebook-paper-sound";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { uiText, useLanguage } from "../i18n/runtime";
import type { HandwritingPaperColor } from "../domain/handwriting";
import type { PaperStyle } from "./handwriting-types";

/** Quanto tempo segurar um tipo ou cor de folha para trocar o caderno inteiro. */
export const PAPER_HOLD_MS = 700;

export type NotebookPaperChange = { paper?: PaperStyle; paperColor?: HandwritingPaperColor };

type HandwritingPaperPickerProps = {
  paper: PaperStyle;
  paperColor: HandwritingPaperColor;
  sectionsOpen: { paper: boolean; color: boolean };
  onToggleSection: (section: "paper" | "color") => void;
  onSelectPaper: (paper: PaperStyle) => void;
  onSelectPaperColor: (color: HandwritingPaperColor) => void;
  /**
   * Troca o caderno inteiro (todas as folhas escritas à mão) e devolve quantas folhas mudaram.
   * Sem ele, segurar não faz nada de especial e o botão "caderno inteiro" não aparece.
   */
  onApplyToNotebook?: (change: NotebookPaperChange) => Promise<number> | number;
};

export function HandwritingPaperPicker({
  paper,
  paperColor,
  sectionsOpen,
  onToggleSection,
  onSelectPaper,
  onSelectPaperColor,
  onApplyToNotebook,
}: HandwritingPaperPickerProps) {
  useLanguage();
  const [visible, setVisible] = useState(true);
  // Segurar um tipo ou uma cor por PAPER_HOLD_MS troca o caderno inteiro: a barra enche enquanto
  // a pessoa segura, com um som que sobe, e ao completar há brilho e um acorde.
  const [holding, setHolding] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopSound = useRef<(() => void) | undefined>(undefined);
  const fired = useRef(false);

  function cancelHold() {
    clearTimeout(timer.current);
    stopSound.current?.();
    stopSound.current = undefined;
    setHolding(null);
  }
  useEffect(() => () => cancelHold(), []);
  useEffect(() => {
    if (!notice) return;
    const hide = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(hide);
  }, [notice]);

  async function applyToNotebook(key: string, change: NotebookPaperChange) {
    if (!onApplyToNotebook) return;
    setApplied(key);
    playPaperAppliedSound();
    setTimeout(() => setApplied(null), 1100);
    const count = await onApplyToNotebook(change);
    setNotice(uiText("Folhas trocadas: {0}.", [count]));
  }

  function holdHandlers(key: string, change: NotebookPaperChange) {
    if (!onApplyToNotebook) return {};
    return {
      onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
        if (event.button !== 0 || !event.isPrimary) return;
        cancelHold();
        fired.current = false;
        setHolding(key);
        stopSound.current = startPaperHoldSound(PAPER_HOLD_MS);
        timer.current = setTimeout(() => {
          fired.current = true;
          // A subida do carregamento termina aqui: o acorde de conclusão toca no lugar dela.
          stopSound.current?.();
          stopSound.current = undefined;
          setHolding(null);
          void applyToNotebook(key, change);
        }, PAPER_HOLD_MS);
      },
      onPointerUp: cancelHold,
      onPointerCancel: cancelHold,
      onPointerLeave: cancelHold,
      // O toque longo no celular não pode abrir o menu do sistema no meio da contagem.
      onContextMenu(event: React.MouseEvent) {
        if (holding === key || fired.current) event.preventDefault();
      },
    };
  }
  // Depois de uma pressão longa o clique que sobra do soltar não pode escolher de novo nem fechar.
  function afterHold(action: () => void) {
    return () => {
      if (fired.current) {
        fired.current = false;
        return;
      }
      action();
    };
  }
  const hint = uiText("Segure para trocar o caderno inteiro");
  const currentChange: NotebookPaperChange | undefined = sectionsOpen.paper
    ? { paper }
    : sectionsOpen.color
      ? { paperColor }
      : undefined;

  return (
    <>
      <button
        type="button"
        className="handwriting-paper-disclosure"
        aria-label={uiText(191)}
        aria-expanded={visible}
        onClick={() => {
          if (visible && sectionsOpen.paper) onToggleSection("paper");
          if (visible && sectionsOpen.color) onToggleSection("color");
          setVisible(!visible);
        }}
      >
        <FocusPaperArrow />
      </button>
      <aside className="handwriting-paper-picker" aria-label={uiText(191)}>
        {visible && (
          <>
            <section className="handwriting-paper-section handwriting-paper-section--type">
              <button
                type="button"
                className="handwriting-paper-section__toggle secondary-button"
                aria-expanded={sectionsOpen.paper}
                aria-label={uiText(192)}
                title={uiText(192)}
                onClick={() => onToggleSection("paper")}
              >
                <span className="paper-preview paper-preview--blank" aria-hidden="true" />
                <span className="paper-picker-label">{uiText(192)}</span>
                <span className="paper-picker-chevron" aria-hidden="true">
                  <FocusPaperArrow />
                </span>
              </button>
            </section>
            <section className="handwriting-paper-section handwriting-paper-section--color">
              <button
                type="button"
                className="handwriting-paper-section__toggle secondary-button"
                aria-expanded={sectionsOpen.color}
                aria-label={uiText(193)}
                title={uiText(193)}
                onClick={() => onToggleSection("color")}
              >
                <span className="paper-preview paper-preview--tone-aged" aria-hidden="true" />
                <span className="paper-picker-label">{uiText(193)}</span>
                <span className="paper-picker-chevron" aria-hidden="true">
                  <FocusPaperArrow />
                </span>
              </button>
            </section>
            {(sectionsOpen.paper || sectionsOpen.color) && (
              <div className="handwriting-paper-options">
                {sectionsOpen.paper
                  ? (
                      [
                        ["board", uiText(1650)],
                        ["ruled", uiText(1651)],
                        ["grid", uiText(1652)],
                        ["blank", uiText(1654)],
                        ["calendar", uiText(194)],
                        ["cornell", uiText(1656)],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        type="button"
                        className={`${paper === value ? "is-active" : ""}${holding === `paper:${value}` ? " is-holding" : ""}${applied === `paper:${value}` ? " is-applied" : ""}`}
                        style={{ "--hold-ms": `${PAPER_HOLD_MS}ms` } as React.CSSProperties}
                        aria-pressed={paper === value}
                        aria-label={label}
                        title={onApplyToNotebook ? `${label}. ${hint}` : label}
                        onClick={afterHold(() => onSelectPaper(value))}
                        {...holdHandlers(`paper:${value}`, { paper: value })}
                        key={value}
                      >
                        <span
                          className={`paper-preview paper-preview--${value}`}
                          aria-hidden="true"
                        />
                        <span className="paper-picker-label">{label}</span>
                      </button>
                    ))
                  : (
                      [
                        ["light", uiText(1658)],
                        ["aged", uiText(1659)],
                        ["night", uiText(1660)],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        type="button"
                        className={`${paperColor === value ? "is-active" : ""}${holding === `color:${value}` ? " is-holding" : ""}${applied === `color:${value}` ? " is-applied" : ""}`}
                        style={{ "--hold-ms": `${PAPER_HOLD_MS}ms` } as React.CSSProperties}
                        aria-pressed={paperColor === value}
                        aria-label={label}
                        title={onApplyToNotebook ? `${label}. ${hint}` : label}
                        onClick={afterHold(() => onSelectPaperColor(value))}
                        {...holdHandlers(`color:${value}`, { paperColor: value })}
                        key={value}
                      >
                        <span
                          className={`paper-preview paper-preview--tone-${value}`}
                          aria-hidden="true"
                        />
                        <span className="paper-picker-label">{label}</span>
                      </button>
                    ))}
                {onApplyToNotebook && currentChange && (
                  <button
                    type="button"
                    className="handwriting-paper-notebook-all secondary-button"
                    aria-label={uiText("Aplicar ao caderno inteiro")}
                    title={uiText("Aplicar ao caderno inteiro")}
                    onClick={() =>
                      void applyToNotebook(
                        sectionsOpen.paper ? `paper:${paper}` : `color:${paperColor}`,
                        currentChange,
                      )
                    }
                  >
                    <span className="paper-picker-label">{uiText("Caderno inteiro")}</span>
                  </button>
                )}
                <p className="handwriting-paper-notice" role="status">
                  {notice}
                </p>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
