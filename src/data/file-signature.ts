// O tipo que o navegador informa para um arquivo vem do nome e pode ser falso. Antes de abrir um
// arquivo enviado, confira os primeiros bytes: um texto que só se declara imagem ou PDF é recusado.
export type SniffedFileKind = "png" | "jpeg" | "webp" | "pdf";

const MIME_BY_KIND: Record<SniffedFileKind, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function sniffFileKind(file: Blob): Promise<SniffedFileKind | undefined> {
  const head = new Uint8Array(await file.slice(0, 1032).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...head.subarray(from, to));
  if (head.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => head[i] === byte))
    return "png";
  if (head.length >= 3 && head[0] === 255 && head[1] === 216 && head[2] === 255) return "jpeg";
  if (head.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  // O PDF pode ter lixo antes do cabeçalho; os leitores aceitam "%PDF-" nos primeiros 1024 bytes.
  if (ascii(0, 1024).includes("%PDF-")) return "pdf";
  return undefined;
}

/** O conteúdo é o tipo que o arquivo diz ser, e esse tipo está entre os aceitos. */
export async function fileMatchesAllowedType(
  file: Blob & { type: string },
  allowed: readonly SniffedFileKind[],
): Promise<boolean> {
  const kind = await sniffFileKind(file);
  return Boolean(kind && allowed.includes(kind) && file.type === MIME_BY_KIND[kind]);
}
