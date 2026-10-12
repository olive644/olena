import type { StudyEvent } from "../domain/workspace";
export function AgendaAttachmentPreview({
  attachments,
  compact = false,
}: {
  attachments?: StudyEvent["attachments"];
  compact?: boolean;
}) {
  const images = attachments?.filter((asset) =>
    /^data:image\/(png|jpeg|webp);base64,/.test(asset.data),
  );
  if (!images?.length) return null;
  return (
    <span className={`agenda-attachment-previews${compact ? " is-compact" : ""}`}>
      {images.map((asset) => (
        <img key={asset.id} src={asset.data} alt={asset.name} loading="lazy" draggable={false} />
      ))}
    </span>
  );
}
