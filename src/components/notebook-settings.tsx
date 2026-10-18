import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { PaperEditorIcon } from "./paper-editor-icon";
import type { NotebookPreferences } from "../data/notebook-preferences";

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
      [
        ["stabilization", uiText(1843), uiText(1844)],
        ["shapeSnap", uiText(1845), uiText(722)],
        ["inkPrediction", uiText(1846), uiText(723)],
        ["penHoverPreview", uiText(724), uiText(1847)],
        ["penOnly", uiText(725), uiText(726)],
        ["writingWindowAutoFollow", uiText(727), "A janela acompanha a escrita automaticamente."],
      ],
    ],
    [uiText(361), [["textAutoCorrect", uiText(164), uiText(728)]]],
    [
      uiText(352),
      [
        ["coordinateMeasurements", uiText(729), uiText(730)],
        ["equalCoordinateAxes", uiText(731), uiText(732)],
      ],
    ],
  ] as const;
  return categories.map(([title, entries]) => (
    <fieldset key={title}>
      <legend>{title}</legend>
      {entries.map(([key, label, hint]) => (
        <label key={key}>
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
  ));
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
              <h2>{uiText(734)}</h2>
            </div>
            <button
              type="button"
              className="sheet-close"
              aria-label={uiText(736)}
              onClick={() => setOpen(false)}
            >
              <PaperEditorIcon name="close" />
            </button>
          </header>
          <NotebookPreferenceFields preferences={preferences} onChange={onChange} />
        </dialog>
      )}
    </>
  );
}
