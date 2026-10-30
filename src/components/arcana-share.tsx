import { useEffect, useRef, useState } from "react";
import type { ArcanaId } from "../data/arcana-ids";
import { uiText } from "../i18n/runtime";
import { LibraryDialog } from "./library-dialog";
import { PaperEditorIcon } from "./paper-editor-icon";
import { PaperArrow } from "./paper-arrow";
import { HelenaLoading } from "./helena-loading";

export function ArcanaShare({
  id,
  owner,
  earnedAt,
  obtained,
  source,
}: {
  id: ArcanaId;
  owner: string;
  earnedAt?: number | undefined;
  obtained: boolean;
  source: () => HTMLElement | null;
}) {
  const [open, setOpen] = useState(false),
    [file, setFile] = useState<File>(),
    [preview, setPreview] = useState(""),
    [error, setError] = useState("");
  const generation = useRef(0);
  const preparing = useRef(false);
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
    setOpen(false);
    setFile(undefined);
    setPreview("");
    setError("");
  }
  async function prepare() {
    const art = source();
    if (!obtained || !art || open || preparing.current) return;
    preparing.current = true;
    const token = ++generation.current;
    setError("");
    setOpen(true);
    try {
      const { arcanaSharePng } = await import("../data/arcana-share-png");
      const result = await arcanaSharePng(art, id, owner, earnedAt);
      if (token !== generation.current) return;
      setFile(result);
      setPreview(URL.createObjectURL(result));
    } catch {
      if (token === generation.current)
        setError(uiText("Não foi possível preparar a imagem. Tente novamente."));
    } finally {
      preparing.current = false;
    }
  }
  return (
    <>
      <button
        className="profile-cards__bare"
        aria-label={
          obtained
            ? uiText("Compartilhar carta")
            : `${uiText("Compartilhar carta")}, ${uiText("Ainda não obtida")}`
        }
        title={uiText(obtained ? "Compartilhar carta" : "Ainda não obtida")}
        aria-disabled={!obtained}
        onClick={() => void prepare()}
      >
        <PaperEditorIcon name="share" />
      </button>
      {open && (
        <LibraryDialog
          title={uiText("Compartilhar carta")}
          onClose={close}
          className="arcana-share-dialog"
        >
          {preview ? (
            <img
              className="arcana-share-preview"
              src={preview}
              alt={uiText("Prévia da carta para compartilhar")}
            />
          ) : !error ? (
            <HelenaLoading compact label={uiText("Preparando imagem…")} />
          ) : null}
          {error && <p role="alert">{error}</p>}
          <div className="arcana-share-actions">
            <button
              className="profile-cards__bare"
              aria-label={uiText("Voltar à carta")}
              title={uiText("Voltar à carta")}
              onClick={close}
            >
              <PaperArrow back />
            </button>
            {file && preview && (
              <>
                {navigator.canShare?.({ files: [file] }) && (
                  <button
                    className="profile-cards__bare"
                    aria-label={uiText("Compartilhar carta")}
                    title={uiText("Compartilhar carta")}
                    onClick={async () => {
                      setError("");
                      try {
                        await navigator.share({ files: [file], title: uiText("Arcano") });
                      } catch (cause) {
                        if (!(cause instanceof DOMException && cause.name === "AbortError"))
                          setError(uiText("Não foi possível compartilhar a imagem."));
                      }
                    }}
                  >
                    <PaperEditorIcon name="share" />
                  </button>
                )}
                <a
                  className="profile-cards__bare"
                  href={preview}
                  download={file.name}
                  aria-label={uiText("Salvar imagem")}
                  title={uiText("Salvar imagem")}
                >
                  <PaperEditorIcon name="download" />
                </a>
              </>
            )}
          </div>
        </LibraryDialog>
      )}
    </>
  );
}
