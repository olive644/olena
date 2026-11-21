import { useEffect, useState } from "react";
import { LibraryDialog } from "./library-dialog";
import { uiText } from "../i18n/runtime";

export function EssayShareIcon({ download = false }: { download?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor">
      {download ? (
        <path d="M13 3h6v13h6l-9 9-9-9h6ZM4 23h5v4h14v-4h5v9H4Z" />
      ) : (
        <path d="m21 2 9 8-9 8v-5h-4c-6 0-9 4-11 9V12c2-4 6-6 11-6h4ZM3 21h5v6h17v-8h5v13H3Z" />
      )}
    </svg>
  );
}

export function EssayShare({
  text,
  title,
  topicId,
  seconds,
}: {
  text: string;
  title: string;
  topicId?: string | undefined;
  seconds: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="secondary-button essay-share-trigger"
        onClick={() => setOpen(true)}
      >
        <EssayShareIcon />
        {uiText("Compartilhar")}
      </button>
      {open && (
        <EssaySharePreview
          text={text}
          title={title}
          topicId={topicId}
          seconds={seconds}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function EssaySharePreview({
  text,
  title,
  topicId,
  seconds,
  onClose,
}: {
  text: string;
  title: string;
  topicId?: string | undefined;
  seconds: number;
  onClose(): void;
}) {
  const [includeProposal, setIncludeProposal] = useState(true);
  const [preview, setPreview] = useState<{ url: string; file: File }>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let url: string | undefined;
    async function build() {
      const { createEssayPngs } = await import("./essay-png-download");
      const blobs = await createEssayPngs(text, title, topicId);
      const images = await Promise.all(
        blobs.map(async (blob) => {
          const source = URL.createObjectURL(blob);
          try {
            const image = new Image();
            image.src = source;
            await image.decode();
            return image;
          } finally {
            URL.revokeObjectURL(source);
          }
        }),
      );
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      // Transparent story canvas: only the original paper images and lettering are painted.
      const font =
        getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() ||
        "sans-serif";
      ctx.textAlign = "center";
      const draw = (
        image: HTMLImageElement,
        x: number,
        y: number,
        width: number,
        height: number,
      ) => {
        const scale = Math.min(width / image.width, height / image.height);
        const w = image.width * scale,
          h = image.height * scale;
        ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
      };
      if (includeProposal) {
        draw(images[1]!, 12, 50, 500, 1650);
        draw(images[0]!, 568, 50, 500, 1650);
        ctx.fillStyle = "#facc15";
        ctx.font = `800 60px ${font}`;
        ctx.fillText("×", 540, 910);
      } else draw(images[0]!, 20, 20, 1040, 1690);
      const total = Math.max(0, Math.floor(seconds));
      const time = String(Math.floor(total / 60)) + ":" + String(total % 60).padStart(2, "0");
      const response = await fetch("/paper-digits.svg");
      if (!response.ok) throw new Error("Digits unavailable");
      const digits = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
      const height = 108;
      const digitWidth = (height * 66) / 98;
      const width = [...time].reduce((sum, ch) => sum + (ch === ":" ? 28 : digitWidth) + 5, -5);
      let x = (1080 - width) / 2;
      for (const character of time) {
        if (character === ":") {
          ctx.fillStyle = "#facc15";
          for (const y of [1770, 1810]) {
            ctx.beginPath();
            ctx.moveTo(x + 8, y);
            ctx.lineTo(x + 21, y);
            ctx.lineTo(x + 21, y + 12);
            ctx.lineTo(x + 17, y + 16);
            ctx.lineTo(x + 4, y + 16);
            ctx.lineTo(x + 4, y + 4);
            ctx.closePath();
            ctx.fill();
          }
          x += 33;
          continue;
        }
        const symbol = digits.getElementById("digit-" + character);
        if (!symbol) throw new Error("Digit unavailable");
        let markup = new XMLSerializer().serializeToString(symbol);
        markup = markup
          .replace(/var\(--digit-face\)/g, "#facc15")
          .replace(/var\(--digit-depth\)/g, "#896300")
          .replace(/var\(--digit-fold\)/g, "#ffe88d")
          .replace(/var\(--digit-edge\)/g, "#a57800");
        const image = new Image();
        image.src =
          "data:image/svg+xml;charset=utf-8," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="66" height="98" viewBox="0 0 66 98"><defs>' +
              markup +
              '</defs><use href="#digit-' +
              character +
              '"/></svg>',
          );
        await image.decode();
        ctx.drawImage(image, x, 1740, digitWidth, height);
        x += digitWidth + 5;
      }
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG unavailable"))), "image/png"),
      );
      if (!active) return;
      url = URL.createObjectURL(blob);
      setPreview({
        url,
        file: new File([blob], "minha-redacao-olenastudy.png", { type: "image/png" }),
      });
    }
    build().catch(() => {
      if (active) setError(uiText("Não foi possível preparar a imagem. Feche e tente novamente."));
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [text, title, topicId, seconds, includeProposal]);
  function download() {
    if (!preview) return;
    const anchor = document.createElement("a");
    anchor.href = preview.url;
    anchor.download = preview.file.name;
    anchor.click();
  }
  async function share() {
    if (!preview) return;
    if (!navigator.canShare?.({ files: [preview.file] }) || !navigator.share) {
      download();
      return;
    }
    try {
      await navigator.share({ files: [preview.file] });
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setError(uiText("Não foi possível compartilhar. Você pode baixar a imagem."));
    }
  }
  return (
    <LibraryDialog
      title={uiText("Compartilhar redação")}
      onClose={onClose}
      className="essay-share-dialog"
    >
      <label className="essay-share-option">
        <input
          type="checkbox"
          checked={includeProposal}
          onChange={(e) => {
            setPreview(undefined);
            setError("");
            setIncludeProposal(e.target.checked);
          }}
        />
        {uiText("Incluir proposta")}
      </label>
      <div className="essay-share-preview">
        {preview ? (
          <img
            src={preview.url}
            alt={uiText("Prévia da redação e do tempo de escrita para compartilhar")}
          />
        ) : (
          <p role="status">{uiText("Preparando prévia…")}</p>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="essay-share-actions">
        <button type="button" className="primary-button" disabled={!preview} onClick={share}>
          {uiText("Compartilhar imagem")}
        </button>
        <button type="button" className="secondary-button" disabled={!preview} onClick={download}>
          {uiText("Baixar PNG")}
        </button>
      </div>
    </LibraryDialog>
  );
}
