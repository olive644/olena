import { afterEach, expect, it, vi } from "vitest";
import { libraryFile } from "./library-files";

afterEach(() => vi.unstubAllGlobals());

it("stores PDF bytes without Blob support and still reads legacy Blobs", async () => {
  const records = new Map<string, unknown>();
  const close = vi.fn();
  const db = {
    close,
    transaction: () => {
      const tx = {
        oncomplete: () => {},
        objectStore: () => ({
          put: (value: unknown, key: string) => {
            if (value instanceof Blob)
              throw new DOMException("Blob not supported", "DataCloneError");
            records.set(key, value);
            queueMicrotask(() => tx.oncomplete());
            return {};
          },
          get: (key: string) => {
            const request = { result: records.get(key), onsuccess: () => {} };
            queueMicrotask(() => {
              request.onsuccess();
              tx.oncomplete();
            });
            return request;
          },
          delete: (key: string) => {
            records.delete(key);
            queueMicrotask(() => tx.oncomplete());
            return {};
          },
        }),
      };
      return tx;
    },
  };
  vi.stubGlobal("indexedDB", {
    open: () => {
      const request = { result: db, onsuccess: () => {} };
      queueMicrotask(() => request.onsuccess());
      return request;
    },
  });
  const text = "%PDF-1.4\noriginal";
  const bytes = new Uint8Array(new ArrayBuffer(text.length));
  [...text].forEach((char, index) => (bytes[index] = char.charCodeAt(0)));
  const pdf = new Blob([bytes], { type: "application/pdf" });
  // JSDOM's Blob lacks arrayBuffer; retain the browser's byte contract in this fixture.
  Object.assign(pdf, { arrayBuffer: async () => bytes.buffer });
  await libraryFile("alice", "pdf", pdf);
  expect(records.get(JSON.stringify(["alice", "pdf"]))).toEqual(bytes.buffer);
  const restored = await libraryFile("alice", "pdf");
  expect(restored).toBeInstanceOf(Blob);
  expect(restored?.size).toBe(pdf.size);
  expect(restored?.type).toBe("application/pdf");
  const restoredBytes = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(restored!);
  });
  expect(restoredBytes).toEqual(bytes.buffer);
  expect(await libraryFile("bob", "pdf")).toBeUndefined();
  records.set(JSON.stringify(["alice", "legacy"]), pdf);
  expect(await libraryFile("alice", "legacy")).toBe(pdf);
  await libraryFile("alice", "pdf", null);
  expect(await libraryFile("alice", "pdf")).toBeUndefined();
  expect(close).toHaveBeenCalledTimes(6);
});
