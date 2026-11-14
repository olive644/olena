import { NotebookToolIcon } from "./notebook-tool-icon";
import { NotebookPageIndex } from "./notebook-page-index";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { PaperCloseIcon } from "./paper-close-icon";
import { HandwritingToolTips } from "./handwriting-tool-tips";
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
  uploadOpen?: boolean;
  uploadPanel?: ReactNode;
  pages: StudyNote[];
  currentPageId: string;
  currentImage: () => string;
  onUpload: () => void;
  onSave: () => void;
  selectionImage?: (() => string) | undefined;
  onPng: () => void;
  onPdf: () => void;
  onPrint: () => void;
  menuOpen?: boolean;
  onMenuChange?: (open: boolean) => void;
};

export function NotebookFileActions({
  settings,
  uploadOpen,
  uploadPanel,
  pages,
  currentPageId,
  currentImage,
  selectionImage,
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
  const [indexOpen, setIndexOpen] = useState(false);
  const [scope, setScope] = useState<"all" | "page" | "selection" | "custom">("page");
  const [format, setFormat] = useState<"png" | "pdf">("pdf");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [viewToken, setViewToken] = useState("");
  const [notice, setNotice] = useState("");
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
      const snapshots =
        scope === "selection"
          ? [{ title: uiText(3852), image: selectionImage?.() }]
          : options
              .filter(
                (page) =>
                  scope === "all" ||
                  (scope === "page" ? page.id === currentPageId : selected.includes(page.id)),
              )
              .map((page) => ({
                title: page.title || uiText(2068),
                image: page.id === currentPageId ? currentImage() : page.assets[0]?.dataUrl,
              }));
      if (!snapshots.length || snapshots.some((page) => !page.image)) throw new Error(uiText(672));
      const ready = snapshots.map((page) => ({ title: page.title, image: page.image! }));
      if (selection === "download") {
        if (scope === "page") {
          if (format === "png") onPng();
          else onPdf();
        } else if (format === "pdf") {
          await downloadNotebookPdf(
            ready.map((page) => page.image),
            scope !== "selection",
          );
        } else {
          const anchor = document.createElement("a");
          anchor.href = ready[0]!.image;
          anchor.download = "selecao-do-caderno.png";
          anchor.click();
        }
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
        setViewToken(payload.token);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : uiText(674));
    } finally {
      setBusy(false);
    }
  }

  function openSelection(kind: "download" | "link", choosePages = false) {
    setMenu(false);
    setSelection(kind);
    setIndexOpen(choosePages);
    setScope("page");
    setFormat("pdf");
    setSelected([currentPageId]);
    setError("");
    setLink("");
    setViewToken("");
    setNotice("");
  }

  async function revokeLink() {
    setBusy(true);
    setError("");
    try {
      const token = await roomAppCheckToken();
      const accountToken = await getFirebaseAccountServices()
        .then(({ auth }) => auth.currentUser?.getIdToken())
        .catch(() => undefined);
      if (!accountToken) throw new Error(uiText(673));
      const response = await fetch("/api/notebook-collab?action=view-revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accountToken}`,
          ...(token ? { "X-Firebase-AppCheck": token } : {}),
        },
        body: JSON.stringify({ token: viewToken }),
      });
      if (!response.ok) throw new Error(uiText(3859));
      setLink("");
      setViewToken("");
      setNotice(uiText(3858));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : uiText(3859));
    } finally {
      setBusy(false);
    }
  }

  return (
    <HandwritingToolTips className="notebook-file-tools" role="group" label={uiText(675)}>
      <span className="notebook-file-tools__label">{uiText(675)}</span>
      {settings}
      <button type="button" aria-label={uiText(676)} aria-expanded={uploadOpen} onClick={onUpload}>
        <PaperEditorIcon name="cloudUpload" />
        <span>{uiText(676)}</span>
      </button>
      {uploadOpen && (
        <div
          className="notebook-file-popover notebook-upload-popover"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              onUpload();
            }
          }}
        >
          {uploadPanel}
        </div>
      )}
      <button
        type="button"
        aria-label={uiText(677)}
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
      >
        <PaperEditorIcon name="share" />
        <span>{uiText(677)}</span>
      </button>
      <button
        type="button"
        aria-label={uiText(678)}
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
            <button type="button" onClick={() => openSelection("download")}>
              <PaperEditorIcon name="download" />
              {uiText(1472)}
            </button>
            <button
              type="button"
              onClick={() => {
                onPrint();
                setMenu(false);
              }}
            >
              <PaperEditorIcon name="print" />
              {uiText(681)}
            </button>
            {options.length > 1 && (
              <button type="button" onClick={() => openSelection("download", true)}>
                <NotebookToolIcon name="index" />
                {uiText(682)}
              </button>
            )}
            <button type="button" onClick={() => openSelection("link")}>
              <PaperEditorIcon name="copyLink" />
              {uiText(683)}
            </button>
          </>
        </div>
      )}
      {selection && (
        <dialog
          ref={dialogRef}
          className="notebook-pages-dialog notebook-export-options"
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
          <header>
            <h3>{selection === "link" ? uiText(684) : uiText(1806)}</h3>
            <button
              type="button"
              className="sheet-close"
              aria-label={uiText(230)}
              disabled={busy}
              onClick={() => setSelection(null)}
            >
              <PaperCloseIcon />
            </button>
          </header>
          {selection === "link" && <p>{uiText(685)}</p>}
          {!link && (
            <fieldset disabled={busy}>
              <legend>{uiText(3849)}</legend>
              {(
                [
                  ["all", 3850],
                  ["page", 3851],
                  ["selection", 3852],
                  ["custom", 3853],
                ] as const
              ).map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    checked={scope === value}
                    disabled={value === "selection" && !selectionImage}
                    onClick={value === "custom" ? () => setIndexOpen(true) : undefined}
                    onChange={() => {
                      if (value === "custom") {
                        setIndexOpen(true);
                        return;
                      }
                      setScope(value);
                      if (value === "all") setFormat("pdf");
                    }}
                  />
                  {uiText(label)}
                </label>
              ))}
              {selection === "download" && (
                <label>
                  {uiText(3854)}
                  <span className="notebook-export-format">
                    <select
                      value={format}
                      onChange={(event) => setFormat(event.target.value === "png" ? "png" : "pdf")}
                    >
                      <option value="pdf">{uiText(3872)}</option>
                      <option value="png" disabled={scope === "all" || scope === "custom"}>
                        {uiText(3873)}
                      </option>
                    </select>
                    <FocusPaperArrow />
                  </span>
                </label>
              )}
            </fieldset>
          )}
          {!link && scope === "custom" && (
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => setIndexOpen(true)}
            >
              {uiText(3853)} · {selected.length}
            </button>
          )}
          {indexOpen && (
            <NotebookPageIndex
              pages={
                pages.length
                  ? pages
                  : [
                      {
                        id: currentPageId,
                        title: uiText(1804),
                        assets: [],
                        content: "",
                        subjectId: "",
                        updatedAt: "",
                      },
                    ]
              }
              currentPageId={currentPageId}
              onSelect={() => {}}
              onClose={() => setIndexOpen(false)}
              selection={{
                ids: selected,
                onConfirm: (ids) => {
                  setSelected(ids);
                  setScope("custom");
                  setFormat("pdf");
                  setIndexOpen(false);
                },
              }}
            />
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
          {notice && <p role="status">{notice}</p>}
          {error && <p role="alert">{uiText(error)}</p>}
          {busy && <HelenaLoading label={uiText(687)} compact />}
          {!link && (
            <button
              type="button"
              disabled={busy || (scope === "custom" && !selected.length)}
              onClick={() => void confirmSelection()}
            >
              {selection === "link" ? uiText(1808) : uiText(3855)}
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
          {link && viewToken && (
            <button type="button" disabled={busy} onClick={() => void revokeLink()}>
              {uiText(3857)}
            </button>
          )}
        </dialog>
      )}
    </HandwritingToolTips>
  );
}
