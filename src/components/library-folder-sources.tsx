import type { StudyMaterial } from "../domain/workspace";
import { uiText } from "../i18n/runtime";
function folderSourceKind(item: StudyMaterial) {
  if (item.tags?.includes("source-goodnotes")) return "goodnotes";
  return item.kind === "link"
    ? "video"
    : item.kind === "pdf"
      ? "pdf"
      : item.kind === "image"
        ? "image"
        : "document";
}
const labels = {
  pdf: "PDF",
  video: "Vídeo",
  goodnotes: "Goodnotes",
  document: "Documento",
  image: "Imagem",
};
export function LibraryFolderSources({
  materials,
  collectionId,
}: {
  materials: readonly StudyMaterial[];
  collectionId: string;
}) {
  const sources = materials.filter(
    (item) =>
      item.collectionId === collectionId &&
      !item.archived &&
      !["folder-summary", "folder-quiz", "folder-exam"].includes(item.tags?.[0] ?? ""),
  );
  const kinds = [...new Set(sources.map(folderSourceKind))].slice(0, 5);
  if (!kinds.length) return null;
  return (
    <span className="library-folder-sources" aria-hidden="true">
      {kinds.map((kind) => (
        <span
          className="library-folder-source"
          data-source-kind={kind}
          key={kind}
          title={uiText(labels[kind])}
        >
          <svg viewBox="0 0 48 60" aria-hidden="true">
            {kind === "video" ? (
              <>
                <path d="M2 10h44v38H2Z" fill="#d45070" />
                <path d="m2 10 10 8h34v-8Z" fill="#ff96a5" />
                <path d="m20 21 15 9-15 10Z" fill="#fff9ef" />
                <path d="M2 43h44v5H2Z" fill="#8d3554" />
              </>
            ) : kind === "goodnotes" ? (
              <>
                <path d="M6 3h34v53H6Z" fill="#4aa9bd" />
                <path d="m6 3 8 8h26V3Z" fill="#9bdecd" />
                <path d="M6 3h6v53H6Z" fill="#246c79" />
                <path d="m17 38 17-22 6 5-17 22-9 4Z" fill="#ffcf35" />
                <path d="m14 47 3-9 6 5Z" fill="#fff9ef" />
              </>
            ) : (
              <>
                <path d="M5 2h26l12 12v43H5Z" fill="#fff9ef" />
                <path d="m31 2 12 12H31Z" fill="#d5c19e" />
                <path d="M5 52h38v5H5Z" fill="#c6b69a" />
                {kind === "pdf" ? (
                  <>
                    <path d="M2 23h43v20H2Z" fill="#bd4965" />
                    <text
                      x="24"
                      y="37"
                      textAnchor="middle"
                      fill="#fff9ef"
                      fontSize="12"
                      fontWeight="900"
                      fontFamily="sans-serif"
                    >
                      PDF
                    </text>
                  </>
                ) : kind === "image" ? (
                  <>
                    <path d="M10 20h27v25H10Z" fill="#59b5bf" />
                    <path d="m10 45 11-15 7 8 9-12v19Z" fill="#246c58" />
                    <path d="M29 23h5v5h-5Z" fill="#ffcf35" />
                  </>
                ) : (
                  <>
                    <path d="M12 23h22v3H12Zm0 8h22v3H12Zm0 8h15v3H12Z" fill="#a78b64" />
                    <path d="m29 11 8 8h-8Z" fill="#f4e7ce" />
                  </>
                )}
              </>
            )}
          </svg>
        </span>
      ))}
    </span>
  );
}
