import { useEffect, useRef, useState } from "react";
import { MAX_ROOM_RECORDING_BYTES, uploadRoomRecording } from "../data/room-recording";
import { HelenaLoading } from "./helena-loading";

type Props = {
  word: string;
  translation: string;
  audioId?: string | undefined;
  code: string;
  credential: string;
  onSaved(id: string): void;
};

const MAX_DURATION_MS = 20_000;

function supportedRecorderType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function")
    return undefined;
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

function normalizedAudio(blob: Blob): Blob {
  const type = blob.type.split(";")[0]?.toLowerCase();
  const mapped = type === "audio/x-m4a" ? "audio/mp4" : type === "audio/mp3" ? "audio/mpeg" : type;
  if (
    !mapped ||
    !["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"].includes(mapped)
  )
    throw new Error("Use áudio WebM, OGG, M4A, MP3 ou WAV.");
  if (blob.size > MAX_ROOM_RECORDING_BYTES)
    throw new Error(
      "A gravação passou de 256 KB. Grave uma fala mais curta ou envie um arquivo menor.",
    );
  return new Blob([blob], { type: mapped });
}

export function RoomRecordingInput({
  word,
  translation,
  audioId,
  code,
  credential,
  onSaved,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blob, setBlob] = useState<Blob | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | undefined>(undefined);

  function selectAudio(next: Blob | undefined) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = next ? URL.createObjectURL(next) : undefined;
    previewUrlRef.current = url;
    setBlob(next);
    setPreviewUrl(url);
  }

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador não permite gravar aqui. Use Enviar arquivo.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = supportedRecorderType();
      const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        try {
          const audio = normalizedAudio(new Blob(chunks, { type: recorder.mimeType }));
          selectAudio(audio);
        } catch (caught) {
          setError(
            caught instanceof Error ? caught.message : "Não foi possível preparar a gravação.",
          );
        }
      };
      recorder.start();
      setRecording(true);
      timerRef.current = window.setTimeout(() => recorder.stop(), MAX_DURATION_MS);
    } catch {
      setError("Não foi possível acessar o microfone. Verifique a permissão ou envie um arquivo.");
    }
  }

  async function save() {
    if (!blob || saving) return;
    setSaving(true);
    setError("");
    try {
      onSaved(await uploadRoomRecording(code, credential, blob));
      selectAudio(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível guardar o áudio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="local-room-recording" aria-label={`Áudio de ${word}`}>
      <div className="local-room-recording__heading">
        <strong>{word}</strong>
        <span>{translation}</span>
        <small>
          {blob ? "Nova gravação não guardada" : audioId ? "Áudio guardado ✓" : "Áudio pendente"}
        </small>
      </div>
      <div className="local-room-recording__controls">
        <button
          className="secondary-button"
          type="button"
          disabled={saving}
          onClick={() => {
            if (recording) recorderRef.current?.stop();
            else void startRecording();
          }}
        >
          <img src="/room-icons/microphone.svg" alt="" width="22" height="22" />
          {recording ? "Parar gravação" : "Gravar"}
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={recording || saving}
          onClick={() => inputRef.current?.click()}
        >
          Enviar arquivo
        </button>
        <input
          ref={inputRef}
          className="local-room-recording__file"
          type="file"
          accept="audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,.m4a,.mp3"
          aria-label={`Enviar áudio de ${word}`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              selectAudio(normalizedAudio(file));
              setError("");
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Áudio inválido.");
            }
            event.target.value = "";
          }}
        />
      </div>
      {recording && <p role="status">Gravando… Pare quando terminar a fala.</p>}
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
