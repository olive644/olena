import { uiText, useLanguage } from "../i18n/runtime";
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
  useLanguage();

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
        setError(caught instanceof Error ? caught.message : uiText(46));
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
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(uiText(47));
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
        aria-label={uiText(1588, [event.title])}
        title={uiText(48)}
        onClick={() => void prepare()}
      >
        <PaperEditorIcon name="share" />
      </button>
      <dialog ref={dialog} className="agenda-share-dialog" aria-label={uiText(49)} onCancel={close}>
        <header>
          <h2>{uiText(49)}</h2>
          <button type="button" className="icon-button" aria-label={uiText(50)} onClick={close}>
            <AgendaCloseIcon />
          </button>
        </header>
        {busy && <HelenaLoading label={uiText(51)} compact />}
        {preview && <img src={preview} alt={uiText(1589, [event.title])} />}
        {error && <p role="alert">{uiText(error)}</p>}
        <footer>
          <button
            type="button"
            className="secondary-button agenda-share-icon"
            aria-label={uiText(52)}
            title={uiText(52)}
            disabled={!file || busy}
            onClick={() => file && downloadExportBlob(file, file.name)}
          >
            <PaperEditorIcon name="download" />
          </button>
          <button
            type="button"
            className="secondary-button agenda-share-icon"
            aria-label={uiText(48)}
            title={uiText(48)}
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
