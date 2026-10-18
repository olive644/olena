import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { roomCodeFromQr } from "../domain/room-qr-invite";
import { HelenaLoading } from "./helena-loading";

export default function RoomQrScanner({ onRead }: { onRead(code: string): void }) {
  useLanguage();

  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);
  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    function scan() {
      if (stopped) return;
      const source = video.current;
      if (source && context && source.videoWidth && source.videoHeight) {
        canvas.width = Math.min(640, source.videoWidth);
        canvas.height = Math.round((canvas.width * source.videoHeight) / source.videoWidth);
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(frame.data, frame.width, frame.height);
        if (decoded) {
          const code = roomCodeFromQr(decoded.data, window.location.origin);
          if (code) {
            onReadRef.current(code);
            return;
          }
          setError(uiText(968));
        }
      }
      timer = setTimeout(scan, 200);
    }
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !context) throw new Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
          if (!stopped) {
            setReady(true);
            scan();
          }
        }
      } catch {
        if (!stopped) setError(uiText(969));
        stream?.getTracks().forEach((track) => track.stop());
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  return (
    <div className="room-qr-scanner">
      <video ref={video} autoPlay muted playsInline aria-label={uiText(970)} />
      {!ready && !error && <HelenaLoading compact label={uiText(971)} />}
      <p role={error ? "alert" : undefined}>{error || uiText(2071)}</p>
    </div>
  );
}
