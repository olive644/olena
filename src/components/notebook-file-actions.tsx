import { useEffect, useRef, useState } from "react";
import { PaperEditorIcon } from "./paper-editor-icon";
import { HelenaLoading } from "./helena-loading";
import type { StudyNote } from "../domain/workspace";
import { downloadNotebookPdf } from "../data/notebook-export";
import { roomAppCheckToken } from "../data/room-app-check";
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
  const options = pages.length ? pages : [{ id: currentPageId, title: "Folha atual", assets: [] }];

  async function confirmSelection() {
    setBusy(true);
    setError("");
    try {
      const snapshots = options
        .filter((page) => selected.includes(page.id))
        .map((page) => ({
          title: page.title || "Folha sem título",
          image: page.id === currentPageId ? currentImage() : page.assets[0]?.dataUrl,
        }));
      if (!snapshots.length || snapshots.some((page) => !page.image))
        throw new Error("Escolha folhas com conteúdo para continuar.");
      const ready = snapshots.map((page) => ({ title: page.title, image: page.image! }));
      if (selection === "download") {
        await downloadNotebookPdf(ready.map((page) => page.image));
        setSelection(null);
      } else {
        const token = await roomAppCheckToken();
        const response = await fetch("/api/notebook-collab?action=view-create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "X-Firebase-AppCheck": token } : {}),
          },
          body: JSON.stringify({ pages: ready }),
        });
        const payload = (await response.json()) as { token?: string; error?: string };
        if (!response.ok || !payload.token)
          throw new Error(payload.error || "Não foi possível gerar o link.");
        const url = new URL(window.location.origin);
        url.searchParams.set("notebook-view", payload.token);
        setLink(url.href);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir.");
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
    <div className="notebook-file-tools" role="group" aria-label="Arquivo">
      <span className="notebook-file-tools__label">Arquivo</span>
      {settings}
      <button type="button" aria-label="Upload" title="Upload" onClick={onUpload}>
        <PaperEditorIcon name="cloudUpload" />
        <span>Upload</span>
      </button>
      <button
        type="button"
        aria-label="Compartilhar"
        title="Compartilhar"
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
      >
        <PaperEditorIcon name="share" />
        <span>Compartilhar</span>
      </button>
      <button
        type="button"
        aria-label="Salvar caderno"
        title="Salvar caderno"
        onClick={() => {
          onSave();
          setMenu(false);
        }}
      >
        <PaperEditorIcon name="save" />
        <span>Salvar caderno</span>
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
              PNG
            </button>
            <button
              type="button"
              onClick={() => {
                onPdf();
                setMenu(false);
              }}
            >
              Baixar PDF
            </button>
            <button
              type="button"
              onClick={() => {
                onPrint();
                setMenu(false);
              }}
            >
              Imprimir
            </button>
            {options.length > 1 && (
              <button type="button" onClick={() => openSelection("download")}>
                Selecionar folhas para download
              </button>
            )}
            <button type="button" onClick={() => openSelection("link")}>
              Link de visualização
            </button>
          </>
          <button type="button" onClick={() => setMenu(false)}>
            Fechar menu
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
          aria-label={
            selection === "link" ? "Link de visualização" : "Selecionar folhas para download"
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              if (!busy) setSelection(null);
            }
          }}
        >
          <h3>
            {selection === "link" ? "Compartilhar somente para leitura" : "Escolha as folhas"}
          </h3>
          {selection === "link" && (
            <p>
              Uma cópia das folhas escolhidas ficará disponível para quem tiver o link, por 7 dias.
              O link não permite editar seu caderno.
            </p>
          )}
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
                  {page.title || "Folha sem título"}
                  {page.id === currentPageId ? " (atual)" : ""}
                </label>
              ))}
            </div>
          )}
          {link && (
            <label>
              Link somente para leitura
              <input
                aria-label="Link somente para leitura"
                value={link}
                readOnly
                onFocus={(event) => event.target.select()}
              />
            </label>
          )}
          {error && <p role="alert">{error}</p>}
          {busy && <HelenaLoading label="Preparando folhas" compact />}
          {!link && (
            <button
              type="button"
              disabled={busy || !selected.length}
              onClick={() => void confirmSelection()}
            >
              {selection === "link" ? "Criar link" : "Baixar PDF selecionado"}
            </button>
          )}
          {link && (
            <button
              type="button"
              onClick={() =>
                void (
                  navigator.clipboard?.writeText(link) ??
                  Promise.reject(new Error("Clipboard indisponível"))
                ).catch(() => setError("Selecione e copie o link acima."))
              }
            >
              Copiar link
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => setSelection(null)}>
            Fechar
          </button>
        </dialog>
      )}
    </div>
  );
}
