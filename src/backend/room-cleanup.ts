export async function cleanExpiredRooms(
  root: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
  maxBatches = 10,
): Promise<{ removed: number; pendingPaths: string[] }> {
  let removed = 0;
  const pendingPaths: string[] = [];
  const deadline = Date.now() + 45000;
  const request: typeof fetch = (input, init) =>
    fetchImpl(input, {
      ...init,
      signal: AbortSignal.timeout(Math.max(1, Math.min(10000, deadline - Date.now()))),
    });
  for (const path of [
    "rooms",
    "private-rooms",
    "room-limits",
    "notebook-collab",
    "notebook-views",
  ]) {
    let complete = false;
    for (let batch = 0; batch < Math.min(10, maxBatches) && Date.now() < deadline; batch++) {
      const url = `${root}/${path}.json?orderBy=${encodeURIComponent('"expiresAt"')}&startAt=0&endAt=${now}&limitToFirst=100`;
      const response = await request(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Não foi possível consultar registros expirados.");
      const entries = (await response.json()) as Record<string, unknown> | null;
      const keys = Object.keys(entries ?? {});
      const removedBefore = removed;
      let processed = 0;
      let conflict = false;
      for (const key of keys) {
        if (Date.now() >= deadline) break;
        const entryUrl = `${root}/${path}/${encodeURIComponent(key)}.json`;
        const snapshot = await request(entryUrl, {
          headers: { Authorization: `Bearer ${token}`, "X-Firebase-ETag": "true" },
        });
        if (!snapshot.ok) throw new Error("Não foi possível conferir expiração.");
        const entry = (await snapshot.json()) as { expiresAt?: number } | null;
        processed++;
        if (!entry || typeof entry.expiresAt !== "number" || entry.expiresAt > now) continue;
        const version = snapshot.headers.get("etag");
        if (!version) throw new Error("Versão ausente na limpeza.");
        const deletion = await request(entryUrl, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}`, "if-match": version },
        });
        if (deletion.ok) removed++;
        else if (deletion.status === 412) conflict = true;
        else throw new Error("Não foi possível remover registro expirado.");
      }
      if (processed === keys.length && keys.length < 100 && !conflict) {
        complete = true;
        break;
      }
      if (removed === removedBefore) break;
    }
    if (!complete) pendingPaths.push(path);
  }
  return { removed, pendingPaths };
}
