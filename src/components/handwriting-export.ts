import { MAX_NOTE_ASSET_DATA_URL_LENGTH } from "../data/local-workspace";

export function exportPage(canvas: HTMLCanvasElement): string {
  const png = canvas.toDataURL("image/png");
  if (png.length <= MAX_NOTE_ASSET_DATA_URL_LENGTH) return png;
  for (const quality of [0.92, 0.82, 0.7, 0.58]) {
    const jpeg = canvas.toDataURL("image/jpeg", quality);
    if (jpeg.length <= MAX_NOTE_ASSET_DATA_URL_LENGTH) return jpeg;
  }
  throw new Error("A folha ficou grande demais. Remova alguns traços e tente novamente.");
}

export function downloadCanvasAsPdf(canvas: HTMLCanvasElement, filename: string) {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const separator = dataUrl.indexOf(",");
  if (separator < 0) throw new Error("Não foi possível preparar o PDF.");
  const binary = atob(dataUrl.slice(separator + 1));
  const imageBytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets = [0, 0, 0, 0, 0, 0];
  let byteLength = 0;

  function append(chunk: string | Uint8Array) {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    byteLength += bytes.byteLength;
  }

  function object(number: number, body: string) {
    offsets[number] = byteLength;
    append(`${number} 0 obj\n${body}\nendobj\n`);
  }

  append("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${canvas.width} ${canvas.height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  );
  offsets[4] = byteLength;
  append(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.byteLength} >>\nstream\n`,
  );
  append(imageBytes);
  append("\nendstream\nendobj\n");
  const content = `q\n${canvas.width} 0 0 ${canvas.height} 0 0 cm\n/Im0 Do\nQ\n`;
  object(5, `<< /Length ${encoder.encode(content).byteLength} >>\nstream\n${content}endstream`);
  const xrefOffset = byteLength;
  append("xref\n0 6\n0000000000 65535 f \n");
  for (const offset of offsets.slice(1)) append(`${String(offset).padStart(10, "0")} 00000 n \n`);
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const blob = new Blob(chunks as unknown as BlobPart[], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
