import { useState } from "react";
import qrcode from "qrcode-generator";
import { PaperEditorIcon } from "./paper-editor-icon";
import type { SocialProfile } from "../domain/profile-social";

export function ProfileShareCard({ person }: { person: SocialProfile }) {
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const url = new URL(
    `/perfil?usuario=${encodeURIComponent(person.username)}`,
    window.location.origin,
  ).href;
  const qr = qrcode(0, "H");
  qr.addData(url);
  qr.make();
  const modules = qr.getModuleCount();
  let path = "";
  for (let y = 0; y < modules; y++)
    for (let x = 0; x < modules; x++) if (qr.isDark(y, x)) path += `M${x + 4} ${y + 4}h1v1h-1Z`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copiado.");
    } catch {
      setStatus("Não foi possível copiar. Selecione o link abaixo.");
    }
  }
  async function share() {
    try {
      await navigator.share({
        title: `${person.name} no OlenaStudy`,
        text: "Vamos estudar juntos?",
        url,
      });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError"))
        setStatus("Não foi possível compartilhar. Você pode copiar o link.");
    }
  }
  async function save() {
    setSaving(true);
    setStatus("");
    try {
      await document.fonts.ready;
      const avatar = new Image();
      avatar.src = person.photoUrl;
      await avatar.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 960;
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.fillStyle = "#FFF9EF";
      context.fillRect(0, 0, 720, 960);
      context.fillStyle = "#7C3AED";
      context.fillRect(0, 0, 720, 220);
      context.fillStyle = "#A779EF";
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(230, 0);
      context.lineTo(0, 170);
      context.fill();
      context.fillStyle = "#51259B";
      context.beginPath();
      context.moveTo(720, 90);
      context.lineTo(720, 220);
      context.lineTo(510, 220);
      context.fill();
      context.fillStyle = "#FFF9EF";
      context.font = "800 30px Manrope, sans-serif";
      context.fillText("OlenaStudy", 40, 64);
      context.drawImage(avatar, 180, 120, 360, 360);
      context.fillStyle = "#292432";
      let size = 44;
      do {
        context.font = `800 ${size--}px Manrope, sans-serif`;
      } while (context.measureText(person.name).width > 640 && size > 18);
      context.fillText(person.name, 40, 536);
      context.font = "700 28px Manrope, sans-serif";
      context.fillText(`@${person.username}`, 40, 580);
      context.font = "600 22px Manrope, sans-serif";
      context.fillText("Vamos estudar juntos?", 40, 636);
      const qr = qrcode(0, "H");
      qr.addData(url);
      qr.make();
      const count = qr.getModuleCount(),
        cell = 240 / (count + 8);
      context.fillStyle = "#FFF9EF";
      context.fillRect(430, 660, 240, 240);
      context.fillStyle = "#292432";
      for (let row = 0; row < count; row++)
        for (let column = 0; column < count; column++)
          if (qr.isDark(row, column))
            context.fillRect(
              430 + (column + 4) * cell,
              660 + (row + 4) * cell,
              cell + 0.15,
              cell + 0.15,
            );
      context.fillStyle = "#7C3AED";
      context.font = "800 24px Manrope, sans-serif";
      context.fillText("Compartilhar perfil", 40, 730);
      context.fillStyle = "#51465D";
      context.font = "500 17px Manrope, sans-serif";
      context.fillText(window.location.host, 40, 772);
      context.fillText(`@${person.username}`, 40, 802);
      context.font = "700 18px Manrope, sans-serif";
      context.fillText("Escaneie para encontrar meu perfil", 40, 926);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((value) => (value ? resolve(value) : reject(new Error())), "image/png"),
      );
      const link = document.createElement("a");
      const download = URL.createObjectURL(blob);
      link.href = download;
      link.download = `olena-perfil-${person.username}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(download), 1000);
      setStatus("Cartão salvo.");
    } catch {
      setStatus("Não foi possível salvar o cartão. Tente copiar o link.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="social-share" aria-label="Compartilhar perfil">
      <div className="social-share-card">
        <strong className="social-share-brand">OlenaStudy</strong>
        <img src={person.photoUrl} alt={`Avatar de ${person.name}`} width="160" height="160" />
        <h3>{person.name}</h3>
        <p>@{person.username}</p>
        <svg
          role="img"
          aria-label="QR code do perfil"
          viewBox={`0 0 ${modules + 8} ${modules + 8}`}
          width="160"
          height="160"
        >
          <path fill="#FFF9EF" d={`M0 0h${modules + 8}v${modules + 8}H0Z`} />
          <path d={path} fill="#292432" shapeRendering="crispEdges" />
        </svg>
        <p>Vamos estudar juntos?</p>
      </div>
      <div className="social-share-actions">
        <button type="button" className="secondary-button" onClick={() => void copy()}>
          <PaperEditorIcon name="copyLink" />
          Copiar link
        </button>
        {typeof navigator.share === "function" && (
          <button type="button" className="secondary-button" onClick={() => void share()}>
            <PaperEditorIcon name="share" />
            Compartilhar
          </button>
        )}
        <button
          type="button"
          className="secondary-button"
          disabled={saving}
          onClick={() => void save()}
        >
          <PaperEditorIcon name="download" />
          {saving ? "Salvando..." : "Salvar cartão"}
        </button>
      </div>
      <label className="social-share-url">
        Link do perfil
        <input value={url} readOnly onFocus={(event) => event.currentTarget.select()} />
      </label>
      {status && <p role="status">{status}</p>}
    </section>
  );
}
