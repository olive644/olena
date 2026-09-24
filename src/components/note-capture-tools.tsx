import { Camera, Copy, RotateCw, Users } from "lucide-react";
import { PaperEditorIcon } from "./paper-editor-icon";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MAX_NOTE_ASSET_DATA_URL_LENGTH } from "../data/local-workspace";
import { encodeHandwritingDraft } from "../data/handwriting-draft";
import type { HandwritingDocument } from "../domain/handwriting";
import type { NoteAsset, StudyNote } from "../domain/workspace";
import type { CloudSyncState } from "../hooks/use-cloud-sync";
import { HandwritingStudio } from "./handwriting-studio";
import { PaperActionIcon } from "./paper-action-icon";
import type { ImportedPage } from "./page-import";
import { useNotebookCollaboration } from "../hooks/use-notebook-collaboration";

type NoteCaptureToolsProps = {
  cloud?: CloudSyncState;
  notebookPages?: StudyNote[];
  draftPageKey: string;
  onSave: (
    kind: NoteAsset["kind"],
    name: string,
    dataUrl: string,
    handwriting?: HandwritingDocument,
  ) => string | void;
  onUpdate?: (assetId: string, dataUrl: string, handwriting: HandwritingDocument) => void;
  onImportPages?: (pages: ImportedPage[]) => void;
  editingAsset?: NoteAsset | null;
  onCloseEditing?: () => void;
  initialJoinCode?: string;
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
  cloud,
  notebookPages = [],
  draftPageKey,
  onSave,
  onUpdate,
  onImportPages,
  editingAsset = null,
  initialJoinCode,
  onCloseEditing,
}: NoteCaptureToolsProps) {
  const [mode, setMode] = useState<"scan" | "drawing" | null>(initialJoinCode ? "drawing" : null);
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  async function toggleFullscreen() {
    if (expanded) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setExpanded(false);
    } else {
      setExpanded(true);
      await dialogRef.current?.requestFullscreen?.().catch(() => {
        // Browsers without native fullscreen keep the viewport-sized editor.
      });
    }
  }
  useEffect(() => {
    function syncFullscreen() {
      setExpanded(document.fullscreenElement === dialogRef.current);
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);
  const [handwritingDirty, setHandwritingDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [draftWriteFailed, setDraftWriteFailed] = useState(false);
  const [closingSavedDraft, setClosingSavedDraft] = useState(false);
  const latestDraftRef = useRef<HandwritingDocument | null>(null);
  const [restoredAssetId] = useState(() => {
    try {
      const id = localStorage.getItem(`helenastudy.handwriting.saved.${draftPageKey}`);
      return notebookPages
        .find((page) => page.id === draftPageKey)
        ?.assets.some((asset) => asset.id === id)
        ? id
        : null;
    } catch {
      return null;
    }
  });
  const savedAssetIdRef = useRef<string | null>(editingAsset?.id ?? restoredAssetId);
  const initialHandwriting =
    editingAsset?.handwriting ??
    notebookPages
      .find((page) => page.id === draftPageKey)
      ?.assets.find((asset) => asset.id === restoredAssetId)?.handwriting;
  const savedDocumentRef = useRef("");
  const saveDocument = (dataUrl: string, handwriting: HandwritingDocument) => {
    const candidateId = editingAsset?.id ?? savedAssetIdRef.current;
    const id =
      editingAsset?.id ??
      (notebookPages
        .find((page) => page.id === draftPageKey)
        ?.assets.some((asset) => asset.id === candidateId)
        ? candidateId
        : null);
    if (id) onUpdate?.(id, dataUrl, handwriting);
    else {
      const created = onSave("drawing", "Folha manuscrita", dataUrl, handwriting);
      if (created) {
        savedAssetIdRef.current = created;
        try {
          localStorage.setItem(`helenastudy.handwriting.saved.${draftPageKey}`, created);
        } catch {
          // Reopening within this session still keeps the saved identifier.
        }
      }
    }
    savedDocumentRef.current = JSON.stringify(handwriting);
  };
  const [collaborationPanelOpen, setCollaborationPanelOpen] = useState(Boolean(initialJoinCode));
  const [collaborationName, setCollaborationName] = useState(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}") as {
        name?: string;
      };
      return profile.name ?? "";
    } catch {
      return "";
    }
  });
  const [collaborationCodeInput, setCollaborationCodeInput] = useState(initialJoinCode ?? "");
  const [remoteDocument, setRemoteDocument] = useState<HandwritingDocument>();
  const [remoteAuthor, setRemoteAuthor] = useState("");
  const notebookId = `page-${draftPageKey}`;
  const collaboration = useNotebookCollaboration({
    notebookId,
    onRemoteDocument: (document, author) => {
      setRemoteDocument(document);
      setRemoteAuthor(author ?? "");
    },
  });
  const currentMode = editingAsset ? "drawing" : mode;

  useEffect(() => {
    if (!currentMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollaborationPanelOpen(false);
      setRemoteDocument(undefined);
      setRemoteAuthor("");
    }
  }, [currentMode]);

  async function copyCollaborationCode() {
    if (!collaboration.state.code) return;
    if (navigator.clipboard)
      await navigator.clipboard.writeText(collaboration.state.code).catch(() => {});
  }

  async function copyCollaborationInvite() {
    if (!collaboration.state.code) return;
    const url = new URL(window.location.origin);
    url.searchParams.set("notebook-collab", collaboration.state.code);
    await navigator.clipboard?.writeText(url.href).catch(() => {});
  }

  const close = useCallback(
    (force = false) => {
      if (!force && currentMode === "drawing" && handwritingDirty) {
        setClosingSavedDraft(savedDocumentRef.current === JSON.stringify(latestDraftRef.current));
        try {
          if (latestDraftRef.current) {
            localStorage.setItem(
              `helenastudy.handwriting.draft.${editingAsset?.id ?? `new-${draftPageKey}`}`,
              encodeHandwritingDraft(latestDraftRef.current, initialHandwriting),
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
      setExpanded(false);
      if (document.fullscreenElement === dialogRef.current && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
      setHandwritingDirty(false);
      if (editingAsset) onCloseEditing?.();
      else setMode(null);
    },
    [currentMode, handwritingDirty, editingAsset, draftPageKey, onCloseEditing, initialHandwriting],
  );

  useEffect(() => {
    if (!currentMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (expanded) {
          setExpanded(false);
          return;
        }
        if (confirmClose) setConfirmClose(false);
        else close();
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [currentMode, confirmClose, close, expanded]);

  return (
    <>
      <div className="note-capture-actions" aria-label="Ferramentas da anotação">
        <button className="secondary-button" type="button" onClick={() => setMode("scan")}>
          <PaperActionIcon name="scan" /> <span>Digitalizar</span>
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            savedDocumentRef.current = "";
            setMode("drawing");
          }}
        >
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
              ref={dialogRef}
              className={
                currentMode === "drawing"
                  ? `capture-dialog capture-dialog--handwriting${expanded ? " capture-dialog--expanded" : ""}`
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
                <div className="capture-header-actions">
                  {currentMode === "drawing" && (
                    <div className="notebook-team" role="group" aria-label="Equipe de edição">
                      {(collaboration.state.room?.participants ?? [])
                        .slice(0, 4)
                        .map((participant, index) => (
                          <span
                            key={participant.id}
                            className={`notebook-team__avatar notebook-team__avatar--${index % 3}${participant.online ? " is-online" : ""}`}
                            title={`${participant.displayName}${participant.online ? " · online" : " · ausente"}`}
                            aria-label={participant.displayName}
                          >
                            {participant.displayName
                              .trim()
                              .split(/\s+/)
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </span>
                        ))}
                      <button
                        type="button"
                        className="notebook-team__add"
                        aria-label={
                          collaboration.state.code
                            ? "Adicionar pessoa ao caderno"
                            : "Compartilhar caderno"
                        }
                        aria-expanded={collaborationPanelOpen}
                        onClick={() => setCollaborationPanelOpen((open) => !open)}
                      >
                        <span aria-hidden="true">+</span>
                      </button>
                    </div>
                  )}
                  {currentMode === "drawing" && (
                    <button
                      type="button"
                      className="sheet-close"
                      aria-label={expanded ? "Sair da tela cheia" : "Tela cheia"}
                      aria-pressed={expanded}
                      onClick={() => void toggleFullscreen()}
                    >
                      <PaperEditorIcon name={expanded ? "collapse" : "expand"} />
                    </button>
                  )}
                  <button
                    className="sheet-close"
                    type="button"
                    aria-label="Fechar"
                    onClick={() => close()}
                  >
                    <PaperEditorIcon name="close" />
                  </button>
                </div>
              </header>
              {currentMode === "drawing" && collaborationPanelOpen && (
                <section className="notebook-collaboration-panel" aria-label="Compartilhar caderno">
                  <div className="notebook-collaboration-panel__heading">
                    <div>
                      <span>COLABORAÇÃO</span>
                      <h3>Compartilhar caderno para escrever junto</h3>
                    </div>
                    <Users size={20} aria-hidden="true" />
                  </div>
                  {collaboration.state.status === "idle" ||
                  collaboration.state.status === "error" ? (
                    <>
                      <label>
                        Seu nome
                        <input
                          value={collaborationName}
                          onChange={(event) => setCollaborationName(event.target.value)}
                          placeholder="Como você quer aparecer?"
                          maxLength={24}
                        />
                      </label>
                      <div className="notebook-collaboration-panel__actions">
                        <button
                          className="primary-button"
                          type="button"
                          onClick={() =>
                            void collaboration.create(
                              collaborationName,
                              latestDraftRef.current ?? remoteDocument,
                            )
                          }
                        >
                          Criar sala
                        </button>
                        <label>
                          Código da sala
                          <input
                            value={collaborationCodeInput}
                            onChange={(event) =>
                              setCollaborationCodeInput(event.target.value.toUpperCase())
                            }
                            placeholder="ABCDE"
                            maxLength={5}
                          />
                        </label>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() =>
                            void collaboration.join(collaborationCodeInput, collaborationName)
                          }
                        >
                          Entrar na sala
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="notebook-collaboration-code">
                        <strong>{collaboration.state.code}</strong>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => void copyCollaborationCode()}
                        >
                          <Copy size={15} /> Copiar código
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => void copyCollaborationInvite()}
                        >
                          <Copy size={15} /> Copiar convite
                        </button>
                      </div>
                      <div className="notebook-collaboration-people">
                        {(collaboration.state.room?.participants ?? []).map((participant) => (
                          <span
                            key={participant.id}
                            className={participant.online ? "is-online" : ""}
                          >
                            {participant.displayName}
                          </span>
                        ))}
                      </div>
                      {collaboration.state.room?.actions.at(-1) && (
                        <p className="notebook-collaboration-activity">
                          {collaboration.state.room.actions.at(-1)?.displayName}{" "}
                          {collaboration.state.room.actions.at(-1)?.label}
                        </p>
                      )}
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => void collaboration.leave()}
                      >
                        Sair da colaboração
                      </button>
                    </>
                  )}
                  {collaboration.state.error && (
                    <p className="capture-error">{collaboration.state.error}</p>
                  )}
                  {collaboration.state.status === "connecting" && <p>Conectando ao caderno…</p>}
                </section>
              )}
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
                  {...(cloud ? { cloud } : {})}
                  notebookPages={notebookPages}
                  currentPageId={draftPageKey}
                  key={editingAsset?.id ?? "new"}
                  {...(initialHandwriting ? { initialDocument: initialHandwriting } : {})}
                  onSave={saveDocument}
                  onAutosave={saveDocument}
                  onClose={() => close(true)}
                  onDirtyChange={setHandwritingDirty}
                  onDraftChange={(document) => {
                    latestDraftRef.current = document;
                    collaboration.publish(document, "editou o caderno");
                  }}
                  {...(remoteDocument ? { remoteDocument } : {})}
                  {...(remoteAuthor ? { remoteAuthor } : {})}
                  {...(collaboration.state.room?.actions.at(-1)
                    ? {
                        collaborationActivity: `${collaboration.state.room.actions.at(-1)?.displayName} ${collaboration.state.room.actions.at(-1)?.label}`,
                      }
                    : {})}
                  onImportPages={(pages) => {
                    onImportPages?.(pages);
                    close(true);
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
                      : cloud?.status === "synced" && closingSavedDraft
                        ? "Sua folha foi salva e sincronizada na sua conta."
                        : cloud?.authenticated
                          ? "Sua folha está protegida neste dispositivo. A sincronização continua enquanto o aplicativo estiver aberto."
                          : "Sua folha está salva neste dispositivo. Entre na sua conta para sincronizar com o computador e o celular."}
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
