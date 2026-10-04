import { afterEach, expect, it, vi } from "vitest";
import { RecordedRoomPlayer } from "./recorded-room-player";
import { loadRoomRecording } from "./room-recording";

vi.mock("./room-recording", () => ({ loadRoomRecording: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("libera por gesto, reproduz Web Audio e cancela a fonte ao trocar de pergunta", async () => {
  const source = {
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  };
  const context = {
    state: "running",
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    decodeAudioData: vi.fn().mockResolvedValue({}),
    createBufferSource: vi.fn(() => source),
  };
  vi.stubGlobal(
    "AudioContext",
    vi.fn(function () {
      return context;
    }),
  );
  vi.mocked(loadRoomRecording).mockResolvedValue(
    await new Response(new Uint8Array([1, 2, 3])).blob(),
  );
  const onState = vi.fn();
  const player = new RecordedRoomPlayer(onState, () => ({
    code: "ABCDE",
    credential: "player-token",
  }));
  player.unlock();
  expect(context.resume).toHaveBeenCalledOnce();
  expect(await player.generate(0)).toBe(true);
  expect(source.start).toHaveBeenCalledOnce();
  expect(onState).toHaveBeenCalledWith({ status: "playing" });
  player.stop();
  expect(source.stop).toHaveBeenCalledOnce();
  expect(source.disconnect).toHaveBeenCalledOnce();
  player.dispose();
  expect(context.close).toHaveBeenCalledOnce();
});

it("decodificação atrasada não inicia áudio de uma pergunta anterior", async () => {
  let finish: ((value: object) => void) | undefined;
  const context = {
    state: "running",
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    decodeAudioData: vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    ),
    createBufferSource: vi.fn(),
  };
  vi.stubGlobal(
    "AudioContext",
    vi.fn(function () {
      return context;
    }),
  );
  vi.mocked(loadRoomRecording).mockResolvedValue(await new Response(new Uint8Array([1])).blob());
  const player = new RecordedRoomPlayer(vi.fn(), () => ({ code: "ABCDE", credential: "token" }));
  player.unlock();
  const playing = player.generate(0);
  await vi.waitFor(() => expect(context.decodeAudioData).toHaveBeenCalledOnce());
  player.stop();
  finish?.({});
  expect(await playing).toBe(false);
  expect(context.createBufferSource).not.toHaveBeenCalled();
  player.dispose();
});
