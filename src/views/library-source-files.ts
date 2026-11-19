// Leitura de arquivos enviados à pasta da Biblioteca. Tudo acontece no aparelho: nada é enviado.
// Arquivos do usuário não são confiáveis, então só viram texto ou imagem, nunca código.

/** Limite de TXT, Markdown e da imagem já reduzida. */
export const MAX_SOURCE_BYTES = 1024 * 1024;
/**
 * Limite de um PDF. Provas oficiais passam de 1 MB (a da PUC-Rio tem 3,4 MB). O PDF fica dentro do
 * espaço de trabalho como texto em base64, cerca de 4/3 do tamanho do arquivo.
 */
export const MAX_PDF_BYTES = 5 * 1024 * 1024;
/**
 * Teto de tudo o que a Biblioteca guarda na conta, em caracteres. O espaço de trabalho inteiro é
 * sincronizado e as regras do banco recusam mais de 20.000.000 caracteres, o que pararia a
 * sincronização de tudo (agenda, progresso). Os 8.000.000 restantes ficam para o resto do espaço.
 */
export const MAX_LIBRARY_CHARS = 12_000_000;

/** Cabe mais este conteúdo na Biblioteca sem passar do teto da conta? */
export function fitsLibrary(usedChars: number, addedChars: number): boolean {
  return usedChars + addedChars <= MAX_LIBRARY_CHARS;
}
/** Foto de celular costuma passar de 1 MB; ela é reduzida antes de guardar, até este tamanho. */
export const MAX_IMAGE_INPUT_BYTES = 25 * 1024 * 1024;

/**
 * Texto de um arquivo .txt ou .md. UTF-8 é o normal, mas o Bloco de Notas do Windows ainda salva
 * em "ANSI" (Windows-1252) e em UTF-16: ler tudo como UTF-8 trocava "fotossíntese" por
 * "fotoss�ntese" e quebrava o resumo.
 */
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff)
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  // BOM de UTF-8 (EF BB BF) é marca de codificação, não parte do texto.
  const body =
    bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Maior lado permitido, mantendo a proporção. Nunca amplia. */
export function fitWithin(
  width: number,
  height: number,
  longest: number,
): { width: number; height: number } {
  const scale = Math.min(1, longest / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Imagem como endereço de dados. Se já cabe no limite, vai como está. Senão (foto de celular), é
 * reduzida em JPEG, em tamanhos e qualidades cada vez menores, até caber. O OCR em português ainda
 * lê bem páginas a 1600 pixels ou mais.
 */
export async function imageDataUrl(file: File, limit = MAX_SOURCE_BYTES): Promise<string> {
  if (file.size <= limit) return toDataUrl(file);
  const bitmap = await createImageBitmap(file);
  try {
    for (const longest of [2400, 2000, 1600]) {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, longest);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) break;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      for (const quality of [0.85, 0.72, 0.6]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality),
        );
        if (blob && blob.size <= limit) return toDataUrl(blob);
      }
    }
  } finally {
    bitmap.close();
  }
  throw new Error("image-too-large");
}
