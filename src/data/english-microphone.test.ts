import { afterEach, expect, it, vi } from "vitest";
import { prepareEnglishMicrophone } from "./english-microphone";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("requests permission on demand and hands back the open stream without recording", async () => {
  const stop = vi.fn(),
    stream = { getTracks: () => [{ stop }] },
    getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("AudioWorkletNode", class {});
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  expect(getUserMedia).not.toHaveBeenCalled();
  expect(await prepareEnglishMicrophone()).toBe(stream);
  expect(stop).not.toHaveBeenCalled();
});
it("does not block the activity when permission is denied", async () => {
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("AudioWorkletNode", class {});
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")),
    },
  });
  expect(await prepareEnglishMicrophone()).toBeUndefined();
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
  expect(await ready).toBeUndefined();
  grant!({ getTracks: () => [{ stop }] });
  await Promise.resolve();
  expect(stop).toHaveBeenCalledOnce();
});
