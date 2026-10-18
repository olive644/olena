import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { PaperEditorIcon } from "./paper-editor-icon";
import { HelenaLoading } from "./helena-loading";
import type { StudyNote } from "../domain/workspace";
import { downloadNotebookPdf } from "../data/notebook-export";
import { roomAppCheckToken } from "../data/room-app-check";
import { getFirebaseAccountServices } from "../data/firebase-account";
import type { ReactNode } from "react";

type Props = {
  settings?: ReactNode;
  pages: StudyNote[];
  currentPageId: string;
  currentImage: () => string;
  onUpload: () => void;
  onSave: () => void;
  onPng: () => void;
  onPdf: () => void;
  onPrint: () => void;
  menuOpen?: boolean;
  onMenuChange?: (open: boolean) => void;
};

export function NotebookFileActions({
  settings,
  pages,
  currentPageId,
  currentImage,
  onUpload,
  onSave,
  onPng,
  onPdf,
  onPrint,
  menuOpen,
  onMenuChange,
}: Props) {
  useLanguage();

  const [localMenu, setLocalMenu] = useState(false);
  const menu = menuOpen ?? localMenu;
  const setMenu = onMenuChange ?? setLocalMenu;
  const [selection, setSelection] = useState<"download" | "link" | null>(null);
  const [selected, setSelected] = useState<string[]>([currentPageId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (selection && dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, [selection]);
  const options = pages.length ? pages : [{ id: currentPageId, title: uiText(1804), assets: [] }];

  async function confirmSelection() {
    setBusy(true);
    setError("");
    try {
      const snapshots = options
        .filter((page) => selected.includes(page.id))
        .map((page) => ({
          title: page.title || uiText(2068),
          image: page.id === currentPageId ? currentImage() : page.assets[0]?.dataUrl,
        }));
      if (!snapshots.length || snapshots.some((page) => !page.image)) throw new Error(uiText(672));
      const ready = snapshots.map((page) => ({ title: page.title, image: page.image! }));
      if (selection === "download") {
        await downloadNotebookPdf(ready.map((page) => page.image));
        setSelection(null);
      } else {
        const token = await roomAppCheckToken();
        const accountToken = await getFirebaseAccountServices()
          .then(({ auth }) => auth.currentUser?.getIdToken())
          .catch(() => undefined);
        if (!accountToken) throw new Error(uiText(673));
        const response = await fetch("/api/notebook-collab?action=view-create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accountToken}`,
            ...(token ? { "X-Firebase-AppCheck": token } : {}),
          },
          body: JSON.stringify({ pages: ready }),
        });
        const payload = (await response.json()) as { token?: string; error?: string };
        if (!response.ok || !payload.token) throw new Error(payload.error || uiText(2069));
        const url = new URL(window.location.origin);
        url.searchParams.set("notebook-view", payload.token);
        setLink(url.href);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : uiText(674));
    } finally {
      setBusy(false);
    }
  }

  function openSelection(kind: "download" | "link") {
    setMenu(false);
    setSelection(kind);
    setSelected([currentPageId]);
    setError("");
    setLink("");
  }

  return (
    <div className="notebook-file-tools" role="group" aria-label={uiText(675)}>
      <span className="notebook-file-tools__label">{uiText(675)}</span>
      {settings}
      <button type="button" aria-label={uiText(676)} title={uiText(676)} onClick={onUpload}>
        <PaperEditorIcon name="cloudUpload" />
        <span>{uiText(676)}</span>
      </button>
      <button
        type="button"
        aria-label={uiText(677)}
        title={uiText(677)}
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
      >
        <PaperEditorIcon name="share" />
        <span>{uiText(677)}</span>
      </button>
      <button
        type="button"
        aria-label={uiText(678)}
        title={uiText(678)}
        onClick={() => {
          onSave();
          setMenu(false);
        }}
      >
        <PaperEditorIcon name="save" />
        <span>{uiText(678)}</span>
      </button>
      {menu && (
        <div
          className="notebook-file-popover"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setMenu(false);
            }
          }}
        >
          <>
            <button
              type="button"
              onClick={() => {
                onPng();
                setMenu(false);
              }}
            >
              {uiText(679)}
            </button>
            <button
              type="button"
              onClick={() => {
                onPdf();
                setMenu(false);
              }}
            >
              {uiText(680)}
            </button>
            <button
              type="button"
              onClick={() => {
                onPrint();
                setMenu(false);
              }}
            >
              {uiText(681)}
            </button>
            {options.length > 1 && (
              <button type="button" onClick={() => openSelection("download")}>
                {uiText(682)}
              </button>
            )}
            <button type="button" onClick={() => openSelection("link")}>
              {uiText(683)}
            </button>
          </>
          <button type="button" onClick={() => setMenu(false)}>
            {uiText(123)}
          </button>
        </div>
      )}
      {selection && (
        <dialog
          ref={dialogRef}
          className="notebook-pages-dialog"
          aria-modal="true"
          onCancel={(event) => {
            event.preventDefault();
            if (!busy) setSelection(null);
          }}
          aria-label={selection === "link" ? uiText(683) : uiText(682)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              if (!busy) setSelection(null);
            }
          }}
        >
          <h3>{selection === "link" ? uiText(684) : uiText(1806)}</h3>
          {selection === "link" && <p>{uiText(685)}</p>}
          {!link && (
            <div className="notebook-pages-dialog__list">
              {options.map((page) => (
                <label key={page.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(page.id)}
                    disabled={busy}
                    onChange={() =>
                      setSelected((ids) =>
                        ids.includes(page.id)
                          ? ids.filter((id) => id !== page.id)
                          : [...ids, page.id],
                      )
                    }
                  />
                  {page.title || uiText(2068)}
                  {page.id === currentPageId ? uiText(1807) : ""}
                </label>
              ))}
            </div>
          )}
          {link && (
            <label>
              {uiText(686)}
              <input
                aria-label={uiText(686)}
                value={link}
                readOnly
                onFocus={(event) => event.target.select()}
              />
            </label>
          )}
          {error && <p role="alert">{uiText(error)}</p>}
          {busy && <HelenaLoading label={uiText(687)} compact />}
          {!link && (
            <button
              type="button"
              disabled={busy || !selected.length}
              onClick={() => void confirmSelection()}
            >
              {selection === "link" ? uiText(1808) : uiText(1809)}
            </button>
          )}
          {link && (
            <button
              type="button"
              onClick={() =>
                void (
                  navigator.clipboard?.writeText(link) ?? Promise.reject(new Error(uiText(688)))
                ).catch(() => setError(uiText(1810)))
              }
            >
              {uiText(461)}
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => setSelection(null)}>
            {uiText(230)}
          </button>
        </dialog>
      )}
    </div>
  );
}
