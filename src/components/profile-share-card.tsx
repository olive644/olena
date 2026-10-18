import { uiText, useLanguage } from "../i18n/runtime";
import { useState, useRef } from "react";
import qrcode from "qrcode-generator";
import { PaperEditorIcon } from "./paper-editor-icon";
import type { SocialProfile } from "../domain/profile-social";
import { ProfileCoverArt } from "./profile-cover-art";
import { profileCover } from "../domain/profile-covers";
import { RoomQrCode } from "./room-qr-code";
import { RoomSocialIcon } from "./room-social-icon";

export function ProfileShareCard({ person }: { person: SocialProfile }) {
  useLanguage();

  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const qrElement = useRef<HTMLDivElement>(null);
  const url = new URL(
    `/perfil?usuario=${encodeURIComponent(person.username)}`,
    window.location.origin,
  ).href;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus(uiText(1909));
    } catch {
      setStatus(uiText(901));
    }
  }
  async function share() {
    try {
      await navigator.share({
        title: uiText(2551, [person.name]),
        text: uiText(908),
        url,
      });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) setStatus(uiText(902));
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
      const cover = new Image();
      cover.src = `/profile-covers/${profileCover(person.cover)}.svg`;
      await cover.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 960;
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.fillStyle = "#FFF9EF";
      context.fillRect(0, 0, 720, 960);
      const coverScale = Math.max(720 / cover.naturalWidth, 220 / cover.naturalHeight);
      const coverWidth = 720 / coverScale,
        coverHeight = 220 / coverScale;
      context.drawImage(
        cover,
        (cover.naturalWidth - coverWidth) / 2,
        (cover.naturalHeight - coverHeight) / 2,
        coverWidth,
        coverHeight,
        0,
        0,
        720,
        220,
      );
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
      context.fillText(uiText(908), 40, 636);
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
      const svg = qrElement.current?.querySelector("svg")?.cloneNode(true) as
        SVGSVGElement | undefined;
      if (svg) {
        const logo = await (await fetch("/favicon-star.svg")).text();
        svg
          .querySelector("image")
          ?.setAttribute("href", `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logo)}`);
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        const code = new Image();
        code.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
        await code.decode();
        context.drawImage(code, 430, 660, 240, 240);
      }
      context.fillStyle = "#7C3AED";
      context.font = "800 24px Manrope, sans-serif";
      context.fillText(uiText(903), 40, 730);
      context.fillStyle = "#51465D";
      context.font = "500 17px Manrope, sans-serif";
      context.fillText(window.location.host, 40, 772);
      context.fillText(`@${person.username}`, 40, 802);
      context.font = "700 18px Manrope, sans-serif";
      context.fillText(uiText(904), 40, 926);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((value) => (value ? resolve(value) : reject(new Error())), "image/png"),
      );
      const link = document.createElement("a");
      const download = URL.createObjectURL(blob);
      link.href = download;
      link.download = uiText(2297, [person.username]);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(download), 1000);
      setStatus(uiText(905));
    } catch {
      setStatus(uiText(906));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="social-share" aria-label={uiText(903)}>
      <div className="social-share-card">
        <div className="social-share-cover">
          <ProfileCoverArt theme={profileCover(person.cover)} />
        </div>
        <strong className="social-share-brand">{uiText(116)}</strong>
        <img
          draggable={false}
          src={person.photoUrl}
          alt={uiText(1910, [person.name])}
          width="160"
          height="160"
        />
        <h3>{person.name}</h3>
        <p>@{person.username}</p>
        <div ref={qrElement}>
          <RoomQrCode value={url} size={180} bare label={uiText(907)} />
        </div>
        <p>{uiText(908)}</p>
      </div>
      <div className="social-share-actions">
        <button type="button" className="secondary-button" onClick={() => void copy()}>
          <RoomSocialIcon kind="copy" />
          {uiText(461)}
        </button>
        {typeof navigator.share === "function" && (
          <button type="button" className="secondary-button" onClick={() => void share()}>
            <PaperEditorIcon name="share" />
            {uiText(677)}
          </button>
        )}
        <button
          type="button"
          className="secondary-button"
          disabled={saving}
          onClick={() => void save()}
        >
          <PaperEditorIcon name="download" />
          {saving ? uiText(1911) : uiText(909)}
        </button>
      </div>
      {status && <p role="status">{uiText(status)}</p>}
    </section>
  );
}
