let fallbackId: string | undefined;
export function focusDeviceId(): string {
  try {
    const saved = localStorage.getItem("helena.focus-device.v1");
    if (saved && saved.length <= 100) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem("helena.focus-device.v1", id);
    return id;
  } catch {
    return (fallbackId ??= crypto.randomUUID());
  }
}
