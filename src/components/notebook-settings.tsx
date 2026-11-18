import {
  useNotebookShortcuts,
  shortcutFromEvent,
  shortcutLabel,
  PEN_ACTIONS,
  type PenShortcutAction,
} from "../data/notebook-shortcuts";
import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { PaperEditorIcon } from "./paper-editor-icon";
import { PaperCardTitle } from "./paper-card-title";
import { PaperCloseIcon } from "./paper-close-icon";
import type { NotebookPreferences } from "../data/notebook-preferences";
import "./notebook-settings.css";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { NOTEBOOK_SHORTCUTS, type NotebookShortcutId } from "./notebook-shortcut-catalog";
import { PenInputTest } from "./pen-input-test";

export function NotebookPreferenceFields({
  preferences,
  onChange,
}: {
  preferences: NotebookPreferences;
  onChange: (key: keyof NotebookPreferences, value: boolean) => void;
}) {
  useLanguage();

  const categories = [
    [
      uiText(1842),
      "pen",
      [
        ["stabilization", uiText(1843), uiText(1844)],
        ["shapeSnap", uiText(1845), uiText(722)],
        [
          "scribbleErase",
          uiText("Rabiscar para apagar"),
          uiText(
            "Risque a escrita em zigue-zague com a caneta para apagar os traços que ficam por baixo. Se apagar sem querer, desfaça.",
          ),
        ],
        ["inkPrediction", uiText(1846), uiText(723)],
        ["penHoverPreview", uiText(724), uiText(1847)],
        [
          "penDiagnostics",
          uiText("Medidor da caneta"),
          uiText(
            "Mostra na tela a entrada da caneta e o tempo de cada quadro enquanto você escreve, para achar travadas. Nada sai do aparelho.",
          ),
        ],
      ],
    ],
    [
      uiText(3796),
      "select",
      [
        ["selectionSnap", uiText(3799), uiText(3800)],
        ["selectionGuides", uiText(3797), uiText(3798)],
      ],
    ],
    [uiText(3801), "hand", [["penOnly", uiText(725), uiText(726)]]],
    [uiText(361), "text", [["textAutoCorrect", uiText(164), uiText(728)]]],
    [
      uiText(352),
      "layers",
      [
        ["coordinateMeasurements", uiText(729), uiText(730)],
        ["equalCoordinateAxes", uiText(731), uiText(732)],
      ],
    ],
  ] as const;
  return (
    <div className="notebook-preference-fields">
      {categories.map(([title, icon, entries]) => (
        <fieldset className="notebook-preference-section" key={title}>
          <legend>
            <PaperEditorIcon name={icon} />
            <span>{title}</span>
          </legend>
          {entries.map(([key, label, hint]) => (
            <label key={key} className="notebook-preference-row">
              <span>
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={(event) => onChange(key, event.target.checked)}
              />
            </label>
          ))}
        </fieldset>
      ))}
      <NotebookShortcutGuide />
    </div>
  );
}

function NotebookShortcutGuide() {
  const { settings, error, changeBinding, changePen, reset } = useNotebookShortcuts();
  const [listening, setListening] = useState<NotebookShortcutId | null>(null);
  const [message, setMessage] = useState("");
  const penLabels = {
    selected: 3818,
    pen: 355,
    highlighter: 356,
    eraser: 357,
    hand: 327,
    select: 359,
  };
  return (
    <>
      <details className="notebook-shortcut-section">
        <summary>
          <PaperEditorIcon name="text" />
          <strong>{uiText(3803)}</strong>
          <FocusPaperArrow />
        </summary>
        <p>{uiText(3805)}</p>
        <p>{uiText(3845)}</p>
        <dl className="notebook-shortcut-list">
          {NOTEBOOK_SHORTCUTS.map((item) => (
            <div key={item.id}>
              <dt>{uiText(item.label)}</dt>
              <dd>
                <button
                  type="button"
                  className="notebook-shortcut-binding"
                  aria-label={uiText(3825, [uiText(item.label)])}
                  aria-pressed={listening === item.id}
                  onClick={() => {
                    setListening(item.id);
                    setMessage("");
                  }}
                  onBlur={() => setListening(null)}
                  onKeyDown={(event) => {
                    if (listening !== item.id) return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.key === "Escape") {
                      setListening(null);
                      return;
                    }
                    const binding =
                      event.key === "Backspace" ? "" : shortcutFromEvent(event.nativeEvent);
                    if (binding === null) return;
                    const conflict = changeBinding(item.id, binding);
                    if (conflict) {
                      setMessage(
                        uiText(3828, [
                          uiText(NOTEBOOK_SHORTCUTS.find((value) => value.id === conflict)!.label),
                        ]),
                      );
                      return;
                    }
                    setListening(null);
                    setMessage(uiText(3848));
                  }}
                >
                  <kbd>
                    {listening === item.id
                      ? uiText(3826)
                      : settings.bindings[item.id]
                        ? shortcutLabel(settings.bindings[item.id])
                        : uiText(3827)}
                  </kbd>
                  <PaperEditorIcon name="pen" />
                </button>
                {listening === item.id && message && (
                  <small className="notebook-shortcut-conflict" role="alert">
                    {message}
                  </small>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </details>
      <details className="notebook-shortcut-section">
        <summary>
          <PaperEditorIcon name="pen" />
          <strong>{uiText(3804)}</strong>
          <FocusPaperArrow />
        </summary>
        <dl className="notebook-shortcut-list notebook-shortcut-list--pen">
          {(["penSide", "penSecond", "penTail"] as const).map((key) => (
            <div key={key}>
              <dt>
                <label htmlFor={"notebook-shortcut-" + key}>
                  {uiText(key === "penSide" ? 3814 : key === "penSecond" ? 4008 : 3817)}
                </label>
                {key === "penSecond" && <small>{uiText(4019)}</small>}
              </dt>
              <dd>
                <span className="notebook-pen-select">
                  <select
                    id={"notebook-shortcut-" + key}
                    value={settings[key]}
                    onChange={(event) => changePen(key, event.target.value as PenShortcutAction)}
                  >
                    {PEN_ACTIONS.map((action) => (
                      <option key={action} value={action}>
                        {uiText(penLabels[action])}
                      </option>
                    ))}
                  </select>
                  <FocusPaperArrow />
                </span>
              </dd>
            </div>
          ))}
          <div>
            <dt>{uiText(3812)}</dt>
            <dd>{uiText(3813)}</dd>
          </div>
          <div>
            <dt>{uiText(3821)}</dt>
            <dd>{uiText(3822)}</dd>
          </div>
          <div>
            <dt>{uiText(3819)}</dt>
            <dd>{uiText(3820)}</dd>
          </div>
        </dl>
        <PenInputTest />
      </details>
      <div className="notebook-shortcut-reset">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            reset();
            setListening(null);
            setMessage(uiText(3846));
          }}
        >
          <PaperEditorIcon name="reset" />
          {uiText(3829)}
        </button>
      </div>
      {((message && !listening) || error) && (
        <p className="notebook-shortcut-message" role={error ? "alert" : "status"}>
          {error ? uiText(3847) : message}
        </p>
      )}
    </>
  );
}

export function NotebookSettings({
  preferences,
  onChange,
}: {
  preferences: NotebookPreferences;
  onChange: (key: keyof NotebookPreferences, value: boolean) => void;
}) {
  useLanguage();

  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open) element?.showModal();
    return () => element?.close();
  }, [open]);
  return (
    <>
      <button
        type="button"
        aria-label={uiText(733)}
        title={uiText(734)}
        onClick={() => setOpen(true)}
      >
        <PaperEditorIcon name="settings" />
        <span>{uiText(734)}</span>
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="notebook-settings"
          aria-label={uiText(733)}
          onCancel={() => setOpen(false)}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <header>
            <div>
              <small>{uiText(735)}</small>
              <h2>
                <PaperCardTitle value={uiText(734)} />
              </h2>
            </div>
            <button
              type="button"
              className="sheet-close"
              aria-label={uiText(736)}
              onClick={() => setOpen(false)}
            >
              <PaperCloseIcon />
            </button>
          </header>
          <p className="notebook-settings__hint">{uiText(3802)}</p>
          <NotebookPreferenceFields preferences={preferences} onChange={onChange} />
        </dialog>
      )}
    </>
  );
}
