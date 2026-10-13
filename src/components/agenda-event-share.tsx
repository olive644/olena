import { useEffect, useRef, useState } from "react";
import type { StudyEvent } from "../domain/workspace";
import { agendaEventPng } from "../data/agenda-event-png";
import { downloadExportBlob } from "../data/paper-export-art";
import { PaperEditorIcon } from "./paper-editor-icon";
import { AgendaCloseIcon } from "./agenda-close-icon";
import { HelenaLoading } from "./helena-loading";

export function AgendaEventShare({
  event,
  date,
  subject,
}: {
  event: StudyEvent;
  date: string;
  subject: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function close() {
    generation.current++;
    dialog.current?.close();
    trigger.current?.focus();
  }
  async function prepare() {
    const current = ++generation.current;
    setError("");
    setFile(null);
    setPreview("");
    setBusy(true);
    dialog.current?.showModal();
    try {
      const next = await agendaEventPng(event, subject, date);
      if (generation.current !== current) return;
      setFile(next);
      setPreview(URL.createObjectURL(next));
    } catch (caught) {
      if (generation.current === current)
        setError(caught instanceof Error ? caught.message : "Não foi possível preparar o PNG.");
    } finally {
      if (generation.current === current) setBusy(false);
    }
  }
  async function share() {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
        downloadExportBlob(file, file.name);
        return;
      }
      await navigator.share({ files: [file], title: event.title });
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError"))
        setError("O navegador não abriu o compartilhamento. Use Baixar PNG.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="secondary-button agenda-share-icon"
        aria-label={`Compartilhar ${event.title}`}
        title="Compartilhar PNG"
        onClick={() => void prepare()}
      >
        <PaperEditorIcon name="share" />
      </button>
      <dialog
        ref={dialog}
        className="agenda-share-dialog"
        aria-label="Compartilhar evento"
        onCancel={close}
      >
        <header>
          <h2>Compartilhar evento</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar compartilhamento"
            onClick={close}
          >
            <AgendaCloseIcon />
          </button>
        </header>
        {busy && <HelenaLoading label="Preparando compartilhamento" compact />}
        {preview && <img src={preview} alt={`Prévia de ${event.title} com selo OlenaStudy`} />}
        {error && <p role="alert">{error}</p>}
        <footer>
          <button
            type="button"
            className="secondary-button agenda-share-icon"
            aria-label="Baixar PNG"
            title="Baixar PNG"
            disabled={!file || busy}
            onClick={() => file && downloadExportBlob(file, file.name)}
          >
            <PaperEditorIcon name="download" />
          </button>
          <button
            type="button"
            className="secondary-button agenda-share-icon"
            aria-label="Compartilhar PNG"
            title="Compartilhar PNG"
            disabled={!file || busy}
            onClick={() => void share()}
          >
            <PaperEditorIcon name="share" />
          </button>
        </footer>
      </dialog>
    </>
  );
}
