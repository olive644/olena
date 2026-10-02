import { useEffect, useRef, useState } from "react";
import { PaperCheckIcon } from "./paper-check-icon";
import { MAX_ROOM_RECORDING_BYTES, uploadRoomRecording } from "../data/room-recording";
import { HelenaLoading } from "./helena-loading";

type Props = {
  word: string;
  translation: string;
  audioId?: string | undefined;
  code: string;
  credential: string;
  onSaved(id: string): void;
  showHeading?: boolean;
  onPending?(): void;
  onStaged?(blob: Blob): void;
  staged?: boolean;
  stagedBlob?: Blob | undefined;
};

export function RoomRecordingInput({
  word,
  translation,
  audioId,
  code,
  credential,
  onSaved,
  showHeading = true,
  onPending,
  onStaged,
  staged = false,
  stagedBlob,
}: Props) {
  const [blob, setBlob] = useState<Blob | undefined>(code ? stagedBlob : undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(() => {
    if (!audioId) return;
    const timer = window.setTimeout(() => setBlob(undefined), 0);
    return () => window.clearTimeout(timer);
  }, [audioId]);
  useEffect(() => {
    const url = blob ? URL.createObjectURL(blob) : "";
    const timer = window.setTimeout(() => setPreviewUrl(url), 0);
    return () => {
      window.clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [blob]);
  async function save() {
    if (!blob || saving) return;
    setSaving(true);
    setError("");
    try {
      if (!code && onStaged) onStaged(blob);
      else onSaved(await uploadRoomRecording(code, credential, blob));
      setBlob(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível guardar o áudio.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="local-room-recording" aria-label={`Áudio de ${word}`}>
      <div className="local-room-recording__heading">
        {showHeading && (
          <>
            <strong>{word}</strong>
            <span>{translation}</span>
          </>
        )}
        <small>
          {blob
            ? "Arquivo ainda não guardado"
            : audioId
              ? "Áudio guardado"
              : staged
                ? "Áudio preparado"
                : "Áudio pendente"}
          {!blob && (audioId || staged) && <PaperCheckIcon size={14} />}
        </small>
      </div>
      <button
        className="secondary-button"
        type="button"
        disabled={saving}
        onClick={() => inputRef.current?.click()}
      >
        <img src="/room-icons/upload.svg" alt="" width="22" height="22" />
        Enviar arquivo
      </button>
      <small>MP3, WAV, OGG, MPEG, M4A ou WebM, até 256 KB por palavra.</small>
      <input
        ref={inputRef}
        className="local-room-recording__file"
        type="file"
        accept="audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,.m4a,.mp3,.wav,.ogg,.mpeg,.webm"
        aria-label={`Enviar áudio de ${word}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
          const types: Record<string, string> = {
            mp3: "audio/mpeg",
            mpeg: "audio/mpeg",
            wav: "audio/wav",
            ogg: "audio/ogg",
            m4a: "audio/mp4",
            webm: "audio/webm",
          };
          const original = file.type.split(";")[0]?.toLowerCase();
          const type =
            original === "audio/x-m4a"
              ? "audio/mp4"
              : original === "audio/mp3" || original === "audio/x-wav"
                ? types[extension]
                : original || types[extension];
          if (
            !type ||
            !["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"].includes(type)
          ) {
            setError("Use áudio MP3, WAV, OGG, MPEG, M4A ou WebM.");
            return;
          }
          if (!file.size || file.size > MAX_ROOM_RECORDING_BYTES) {
            setError("Envie um arquivo não vazio de até 256 KB.");
            return;
          }
          setBlob(new Blob([file], { type }));
          setError("");
          onPending?.();
        }}
      />
      {previewUrl && blob && (
        <div className="local-room-recording__preview">
          <audio controls src={previewUrl} aria-label={`Prévia de ${word}`} />
          <button
            className="secondary-button"
            type="button"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "Guardando…" : "Guardar áudio"}
          </button>
        </div>
      )}
      {saving && <HelenaLoading compact label="Guardando áudio…" />}
      {error && (
        <p className="local-room-recording__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
