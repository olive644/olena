import { uiText, useLanguage } from "../i18n/runtime";
import { useState, useRef } from "react";
import qrcode from "qrcode-generator";
import { PaperEditorIcon } from "./paper-editor-icon";
import type { SocialProfile } from "../domain/profile-social";
import { ProfileCoverArt } from "./profile-cover-art";
import { profileCover } from "../domain/profile-covers";
import { RoomQrCode } from "./room-qr-code";
import { RoomSocialIcon } from "./room-social-icon";
import { ProfileLabels } from "./profile-labels";
import { profileLabelNames } from "../domain/profile-labels";
import { ProfileLevelBadge } from "./profile-study-widgets";
import { useProfileStudy } from "../hooks/use-profile-study";
import { AchievementArt } from "./math-achievements";
import { ALL_ACHIEVEMENTS } from "../domain/math-achievements";

// Cores das etiquetas no papel creme do cartão (as mesmas do perfil, tema claro).
const LABEL_COLORS: Record<string, [string, string]> = {
  CREKS: ["#19171E", "#FFFDF7"],
  DEV: ["#7C3AED", "#FFF9EF"],
  "BETA TESTER": ["#FACC15", "#292432"],
  GALAXIA: ["#25416C", "#FFF9EF"],
};

export function ProfileShareCard({
  person,
  featured = [],
}: {
  person: SocialProfile;
  featured?: readonly string[];
}) {
  useLanguage();

  const { level } = useProfileStudy();
  const labels = profileLabelNames(person.username, person.username === "oliver644");
  const highlights = featured
    .flatMap((id) => ALL_ACHIEVEMENTS.find((item) => item.id === id) ?? [])
    .slice(0, 3);

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
      // Selo de nível no canto da foto, como no perfil.
      context.save();
      context.translate(468, 420);
      context.scale(0.82, 0.82);
      context.beginPath();
      context.moveTo(14, 0);
      context.lineTo(130, 0);
      context.lineTo(144, 70);
      context.lineTo(72, 104);
      context.lineTo(0, 70);
      context.closePath();
      context.fillStyle = "#B88C13";
      context.fill();
      context.translate(0, -6);
      context.fill();
      context.fillStyle = "#FACC15";
      context.fill();
      context.fillStyle = "#292432";
      context.textAlign = "center";
      context.font = "900 20px Manrope, sans-serif";
      context.fillText("NV", 40, 56);
      context.font = "900 54px Manrope, sans-serif";
      context.fillText(String(level), 96, 68);
      context.restore();
      context.textAlign = "left";
      context.fillStyle = "#292432";
      let size = 44;
      do {
        context.font = `800 ${size--}px Manrope, sans-serif`;
      } while (context.measureText(person.name).width > 640 && size > 18);
      context.fillText(person.name, 40, 536);
      context.font = "700 28px Manrope, sans-serif";
      context.fillText(`@${person.username}`, 40, 580);
      let tagY = 636;
      if (labels.length) {
        context.font = "900 16px Manrope, sans-serif";
        let x = 40;
        for (const label of labels) {
          const [background, color] = LABEL_COLORS[label] ?? LABEL_COLORS["CREKS"]!;
          const width = context.measureText(label).width + 36 + label.length * 1.6;
          context.fillStyle = background;
          context.fillRect(x, 600, width, 30);
          context.fillStyle = color;
          context.fillText(label.split("").join("\u200A"), x + 18, 621);
          x += width + 10;
        }
        tagY = 672;
      }
      context.fillStyle = "#292432";
      context.font = "600 22px Manrope, sans-serif";
      context.fillText(uiText(908), 40, tagY);
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
      if (highlights.length) {
        // Destaques menores, na coluna do texto, sem tomar o espaço do QR.
        const arts = [
          ...(qrElement.current
            ?.closest(".social-share-card")
            ?.querySelectorAll(".social-share-highlights .math-achievement-art > svg") ?? []),
        ] as SVGSVGElement[];
        const { inlineAchievementArt } = await import("../data/achievement-png");
        for (const [index, art] of arts.entries()) {
          const clone = art.cloneNode(true) as SVGSVGElement;
          await inlineAchievementArt(clone, (path) =>
            /^\/achievement-badges\/(math|general)\/thumb\/[a-z0-9-]+\.webp$/.test(path),
          );
          clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          const badge = new Image();
          badge.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
          await badge.decode();
          context.drawImage(badge, 40 + index * 98, 816, 88, 88);
        }
      }
      context.fillStyle = "#51465D";
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
        <div className="social-share-avatar">
          <img
            draggable={false}
            src={person.photoUrl}
            alt={uiText(1910, [person.name])}
            width="160"
            height="160"
          />
          <ProfileLevelBadge />
        </div>
        <h3>{person.name}</h3>
        <ProfileLabels username={person.username} creks={person.username === "oliver644"} />
        <p>@{person.username}</p>
        {highlights.length > 0 && (
          <div className="social-share-highlights" aria-label={uiText(2854)}>
            {highlights.map((item) => (
              <AchievementArt key={item.id} item={item} thumb />
            ))}
          </div>
        )}
        <div ref={qrElement}>
          <RoomQrCode value={url} size={180} bare label={uiText(907)} />
        </div>
        <p>{uiText(908)}</p>
      </div>
      <div className="social-share-actions">
        <button
          type="button"
          className="secondary-button icon-only"
          aria-label={uiText(461)}
          title={uiText(461)}
          onClick={() => void copy()}
        >
          <RoomSocialIcon kind="copy" />
        </button>
        {typeof navigator.share === "function" && (
          <button
            type="button"
            className="secondary-button icon-only"
            aria-label={uiText(677)}
            title={uiText(677)}
            onClick={() => void share()}
          >
            <PaperEditorIcon name="share" />
          </button>
        )}
        <button
          type="button"
          className="secondary-button icon-only"
          aria-label={saving ? uiText(1911) : uiText(909)}
          title={saving ? uiText(1911) : uiText(909)}
          disabled={saving}
          onClick={() => void save()}
        >
          <PaperEditorIcon name="download" />
        </button>
      </div>
      {status && <p role="status">{uiText(status)}</p>}
    </section>
  );
}
