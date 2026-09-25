import { useEffect, useRef, useState } from "react";
import { PaperEditorIcon } from "./paper-editor-icon";
import type { NotebookPreferences } from "../data/notebook-preferences";

export function NotebookSettings({
  preferences,
  onChange,
}: {
  preferences: NotebookPreferences;
  onChange: (key: keyof NotebookPreferences, value: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open) element?.showModal();
    return () => element?.close();
  }, [open]);
  const categories = [
    [
      "Escrita e toque",
      [
        [
          "stabilization",
          "Ajuste inteligente",
          "Suaviza o movimento e endireita linhas quase retas.",
        ],
        ["penOnly", "Só caneta, dedo move", "Use os dedos para navegar e a caneta para escrever."],
        [
          "writingWindowAutoFollow",
          "Avanço da janela de escrita",
          "A janela acompanha a escrita automaticamente.",
        ],
      ],
    ],
    [
      "Texto",
      [["textAutoCorrect", "Correção automática de texto", "Revisa acentos e início das frases."]],
    ],
    [
      "Coordenadas",
      [
        ["coordinateMeasurements", "Medições nos eixos", "Mostra valores nas divisões dos eixos."],
        [
          "equalCoordinateAxes",
          "Eixos com o mesmo tamanho",
          "Mantém a mesma extensão horizontal e vertical.",
        ],
      ],
    ],
  ] as const;
  return (
    <>
      <button
        type="button"
        aria-label="Configurações do editor"
        title="Configurações"
        onClick={() => setOpen(true)}
      >
        <PaperEditorIcon name="settings" />
        <span>Configurações</span>
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="notebook-settings"
          aria-label="Configurações do editor"
          onCancel={() => setOpen(false)}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <header>
            <div>
              <small>DO SEU JEITO</small>
              <h2>Configurações</h2>
            </div>
            <button
              type="button"
              className="sheet-close"
              aria-label="Fechar configurações"
              onClick={() => setOpen(false)}
            >
              <PaperEditorIcon name="close" />
            </button>
          </header>
          {categories.map(([title, entries]) => (
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
          ))}
        </dialog>
      )}
    </>
  );
}
