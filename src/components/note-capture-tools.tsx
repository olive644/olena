import { Camera, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MAX_NOTE_ASSET_DATA_URL_LENGTH } from "../data/local-workspace";
import type { HandwritingDocument } from "../domain/handwriting";
import type { NoteAsset } from "../domain/workspace";
import { HandwritingStudio } from "./handwriting-studio";
import { PaperActionIcon } from "./paper-action-icon";

type NoteCaptureToolsProps = {
  draftPageKey: string;
  onSave: (
    kind: NoteAsset["kind"],
    name: string,
    dataUrl: string,
    handwriting?: HandwritingDocument,
  ) => void;
  onUpdate?: (assetId: string, dataUrl: string, handwriting: HandwritingDocument) => void;
  editingAsset?: NoteAsset | null;
  onCloseEditing?: () => void;
};

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível abrir esta imagem."));
    image.src = url;
  });
}

function exportWithinLimit(canvas: HTMLCanvasElement, kind: "image/jpeg" | "image/png"): string {
  const qualities = kind === "image/jpeg" ? [0.76, 0.62, 0.48] : [undefined];
  for (const quality of qualities) {
    const dataUrl = canvas.toDataURL(kind, quality);
    if (dataUrl.length <= MAX_NOTE_ASSET_DATA_URL_LENGTH) return dataUrl;
  }
  throw new Error(
    "A imagem ainda ficou grande demais. Fotografe uma área menor e tente novamente.",
  );
}

function Scanner({
  onSave,
  onClose,
}: Pick<NoteCaptureToolsProps, "onSave"> & { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<{ url: string; name: string } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [grayscale, setGrayscale] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    void loadImage(source.url)
      .then((image) => {
        if (cancelled) return;
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const rotated = rotation % 180 !== 0;
        const sourceWidth = rotated ? image.naturalHeight : image.naturalWidth;
        const sourceHeight = rotated ? image.naturalWidth : image.naturalHeight;
        const scale = Math.min(1, 1200 / Math.max(sourceWidth, sourceHeight));
        canvas.width = Math.max(1, Math.round(sourceWidth * scale));
        canvas.height = Math.max(1, Math.round(sourceHeight * scale));
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.save();
        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate((rotation * Math.PI) / 180);
        context.filter = grayscale ? "grayscale(1) contrast(1.14)" : "none";
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        context.drawImage(image, -width / 2, -height / 2, width, height);
        context.restore();
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Não foi possível abrir esta imagem.");
      });
    return () => {
      cancelled = true;
    };
  }, [grayscale, rotation, source]);

  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source.url);
    },
    [source],
  );

  function chooseFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!/^image\/(?:jpeg|png|webp)$/.test(file.type)) {
      setError("Use uma imagem JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("A imagem original deve ter no máximo 12 MB.");
      return;
    }
    if (source) URL.revokeObjectURL(source.url);
    setSource({ url: URL.createObjectURL(file), name: file.name || "Documento digitalizado" });
    setRotation(0);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    try {
      onSave("scan", source.name, exportWithinLimit(canvas, "image/jpeg"));
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a imagem.");
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        aria-label="Fotografar ou escolher documento"
        onChange={(event) => chooseFile(event.target.files?.[0])}
      />
      {!source ? (
        <button className="scanner-drop" type="button" onClick={() => inputRef.current?.click()}>
          <Camera size={28} />
          <strong>Fotografar ou escolher uma imagem</strong>
          <span>No celular, a câmera traseira será oferecida quando o navegador permitir.</span>
        </button>
      ) : (
        <>
          <div className="capture-controls">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setRotation((value) => (value + 90) % 360)}
            >
              <RotateCw size={16} /> Girar
            </button>
            <label className="capture-check">
              <input
                type="checkbox"
                checked={grayscale}
                onChange={(event) => setGrayscale(event.target.checked)}
              />
              <span>Realçar documento</span>
            </label>
            <button
              className="secondary-button"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              Trocar imagem
            </button>
          </div>
          <canvas ref={canvasRef} className="scanner-canvas" aria-label="Prévia do documento" />
        </>
      )}
      {error && <p className="capture-error">{error}</p>}
      {source && (
        <div className="capture-footer">
          <small>
            A imagem é reduzida e permanece somente neste dispositivo. Esta fase não usa OCR.
          </small>
          <button className="primary-button" type="button" onClick={save}>
            Salvar digitalização
          </button>
        </div>
      )}
    </>
  );
}

export function NoteCaptureTools({
  draftPageKey,
  onSave,
  onUpdate,
  editingAsset = null,
  onCloseEditing,
}: NoteCaptureToolsProps) {
  const [mode, setMode] = useState<"scan" | "drawing" | null>(null);
  const [handwritingDirty, setHandwritingDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [draftWriteFailed, setDraftWriteFailed] = useState(false);
  const latestDraftRef = useRef<HandwritingDocument | null>(null);
  const currentMode = editingAsset ? "drawing" : mode;

  const close = useCallback(
    (force = false) => {
      if (!force && currentMode === "drawing" && handwritingDirty) {
        try {
          if (latestDraftRef.current) {
            localStorage.setItem(
              `helenastudy.handwriting.draft.${editingAsset?.id ?? `new-${draftPageKey}`}`,
              JSON.stringify(latestDraftRef.current),
            );
          }
          setDraftWriteFailed(false);
        } catch {
          setDraftWriteFailed(true);
        }
        setConfirmClose(true);
        return;
      }
      setConfirmClose(false);
      setHandwritingDirty(false);
      if (editingAsset) onCloseEditing?.();
      else setMode(null);
    },
    [currentMode, handwritingDirty, editingAsset, draftPageKey, onCloseEditing],
  );

  useEffect(() => {
    if (!currentMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (confirmClose) setConfirmClose(false);
        else close();
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [currentMode, confirmClose, close]);

  return (
    <>
      <div className="note-capture-actions" aria-label="Ferramentas da anotação">
        <button className="secondary-button" type="button" onClick={() => setMode("scan")}>
          <PaperActionIcon name="scan" /> <span>Digitalizar</span>
        </button>
        <button className="secondary-button" type="button" onClick={() => setMode("drawing")}>
          <PaperActionIcon name="handwriting" /> <span>Escrever à mão</span>
        </button>
      </div>

      {currentMode &&
        createPortal(
          <div className="capture-layer">
            <button
              className="capture-backdrop"
              type="button"
              aria-label="Fechar ferramenta"
              onClick={() => close()}
            />
            <section
              className={
                currentMode === "drawing"
                  ? "capture-dialog capture-dialog--handwriting"
                  : "capture-dialog"
              }
              role="dialog"
              aria-modal="true"
              aria-labelledby="capture-title"
            >
              <header>
                <div>
                  <span>Cadernos</span>
                  <h2 id="capture-title">
                    {currentMode === "scan"
                      ? "Digitalizar documento"
                      : editingAsset
                        ? "Folha manuscrita"
                        : "Escrever à mão"}
                  </h2>
                </div>
                <button
                  className="sheet-close"
                  type="button"
                  aria-label="Fechar"
                  onClick={() => close()}
                >
                  <X size={20} />
                </button>
              </header>
              {currentMode === "scan" ? (
                <Scanner onSave={onSave} onClose={() => close(true)} />
              ) : editingAsset && !editingAsset.handwriting ? (
                <div className="handwriting-legacy-preview">
                  <p>
                    Esta folha antiga foi salva como imagem. Os traços não podem ser editados, mas
                    você pode consultá-la aqui.
                  </p>
                  <img src={editingAsset.dataUrl} alt={editingAsset.name} />
                </div>
              ) : (
                <HandwritingStudio
                  key={editingAsset?.id ?? "new"}
                  {...(editingAsset?.handwriting
                    ? { initialDocument: editingAsset.handwriting }
                    : {})}
                  onSave={(dataUrl, handwriting) => {
                    if (editingAsset) onUpdate?.(editingAsset.id, dataUrl, handwriting);
                    else onSave("drawing", "Folha manuscrita", dataUrl, handwriting);
                  }}
                  onClose={() => close(true)}
                  onDirtyChange={setHandwritingDirty}
                  onDraftChange={(document) => {
                    latestDraftRef.current = document;
                  }}
                  draftKey={editingAsset?.id ?? `new-${draftPageKey}`}
                />
              )}
              {confirmClose && (
                <div
                  className="handwriting-close-confirm"
                  role="alertdialog"
                  aria-label="Fechar folha com alterações"
                >
                  <p>
                    {draftWriteFailed
                      ? "Não foi possível guardar o rascunho. Salve a folha antes de sair ou feche sem salvar."
                      : "Suas alterações estão no rascunho deste dispositivo. Deseja fechar a folha?"}
                  </p>
                  <div>
                    <button type="button" onClick={() => setConfirmClose(false)}>
                      Continuar editando
                    </button>
                    <button type="button" onClick={() => close(true)}>
                      {draftWriteFailed ? "Fechar sem salvar" : "Fechar e manter rascunho"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}

export default NoteCaptureTools;
