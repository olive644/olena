// PDFs remain on this device. Account-scoped keys prevent cross-account reuse.
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("olena-library-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function libraryFile(
  scope: string,
  id: string,
  value?: Blob | null,
): Promise<Blob | undefined> {
  // WebKit rejects Blob/File records in ephemeral sessions; bytes work in both modes.
  const bytes = value instanceof Blob ? await value.arrayBuffer() : undefined;
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("files", value === undefined ? "readonly" : "readwrite");
      const store = tx.objectStore("files");
      const key = JSON.stringify([scope, id]);
      const request =
        value === undefined
          ? store.get(key)
          : value === null
            ? store.delete(key)
            : store.put(
                value?.type.startsWith("image/") ? { bytes, mime: value.type } : bytes,
                key,
              );
      let result: Blob | undefined;
      request.onsuccess = () => {
        const stored: unknown = request.result;
        result =
          stored &&
          typeof stored === "object" &&
          "bytes" in stored &&
          stored.bytes instanceof ArrayBuffer &&
          "mime" in stored &&
          ["image/png", "image/jpeg", "image/webp"].includes(String(stored.mime))
            ? new Blob([stored.bytes], { type: String(stored.mime) })
            : request.result instanceof ArrayBuffer
              ? new Blob([request.result], { type: "application/pdf" })
              : request.result instanceof Blob
                ? request.result
                : undefined;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function pdfFingerprint(file: Blob): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error("PDF_LIMIT");
  const data = await file.arrayBuffer();
  const header = new TextDecoder().decode(data.slice(0, 1024));
  if (!header.includes("%PDF-")) throw new Error("PDF_FORMAT");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function imageFingerprint(file: Blob): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("IMAGE_LIMIT");
  const data = await file.arrayBuffer(),
    bytes = new Uint8Array(data);
  const png =
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    new TextDecoder().decode(data.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(data.slice(8, 12)) === "WEBP";
  if (!(
    (file.type === "image/png" && png) ||
    (file.type === "image/jpeg" && jpeg) ||
    (file.type === "image/webp" && webp)
  ))
    throw new Error("IMAGE_FORMAT");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
