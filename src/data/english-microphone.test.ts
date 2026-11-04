import { afterEach, expect, it, vi } from "vitest";
import { prepareEnglishMicrophone } from "./english-microphone";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("requests permission on demand and releases the microphone without recording", async () => {
  const stop = vi.fn(),
    getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("AudioWorkletNode", class {});
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  expect(getUserMedia).not.toHaveBeenCalled();
  expect(await prepareEnglishMicrophone()).toBe(true);
  expect(stop).toHaveBeenCalledOnce();
});
it("does not block the activity when permission is denied", async () => {
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("AudioWorkletNode", class {});
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")),
    },
  });
  expect(await prepareEnglishMicrophone()).toBe(false);
});
it("releases a permission grant arriving after the timeout", async () => {
  vi.useFakeTimers();
  let grant: ((value: unknown) => void) | undefined;
  const stop = vi.fn();
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("AudioWorkletNode", class {});
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    },
  });
  const ready = prepareEnglishMicrophone();
  await vi.advanceTimersByTimeAsync(20000);
  expect(await ready).toBe(false);
  grant!({ getTracks: () => [{ stop }] });
  await Promise.resolve();
  expect(stop).toHaveBeenCalledOnce();
});
