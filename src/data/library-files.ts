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
            : store.put(bytes, key);
      let result: Blob | undefined;
      request.onsuccess = () => {
        result =
          request.result instanceof ArrayBuffer
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
