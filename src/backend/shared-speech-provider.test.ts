import { describe, expect, it, vi } from "vitest";
import { createMemoryRoomStore } from "./room-transaction";
import { createSharedSpeechProvider } from "./shared-speech-provider";
import type { SpeechProvider, SpeechRequest } from "./speech-handler";

const request: SpeechRequest = {
  text: "Hello class",
  rate: 1,
  consent: true,
  roomCode: "ABCDE",
};

function setup() {
  const store = createMemoryRoomStore();
  const synthesize = vi.fn<SpeechProvider["synthesize"]>().mockResolvedValue({
    audio: new Uint8Array([1, 2, 3]),
    contentType: "audio/mpeg",
  });
  const consume = vi.fn().mockResolvedValue(true);
  const provider = createSharedSpeechProvider({ synthesize }, store, { consume });
  return { provider, synthesize, consume, store };
}

describe("áudio compartilhado", () => {
  it("entrega a mesma gravação para aparelhos diferentes e gera uma só vez", async () => {
    const { provider, synthesize, consume } = setup();
    const results = await Promise.all(
      Array.from({ length: 30 }, (_, index) => provider.synthesize(request, `device-${index}`)),
    );

    expect(synthesize).toHaveBeenCalledOnce();
    expect(consume).toHaveBeenCalledOnce();
    for (const result of results) expect(result.audio).toEqual(results[0]?.audio);
    expect((await provider.synthesize(request, "device-30")).audio).toEqual(results[0]?.audio);
    expect(synthesize).toHaveBeenCalledOnce();
  });

  it("separa gravações de velocidades diferentes", async () => {
    const { provider, synthesize } = setup();
    await provider.synthesize(request, "device-1");
    await provider.synthesize({ ...request, rate: 0.75 }, "device-2");
    expect(synthesize).toHaveBeenCalledTimes(2);
  });

  it("não guarda em cache o áudio do quiz individual", async () => {
    const { provider, synthesize } = setup();
    const individual = { text: "Hello", rate: 1, consent: true } as const;
    await provider.synthesize(individual, "device-1");
    await provider.synthesize(individual, "device-1");
    expect(synthesize).toHaveBeenCalledTimes(2);
  });

  it("não usa a frase em texto legível como chave do armazenamento", async () => {
    const { provider, store } = setup();
    const readVersion = vi.spyOn(store, "readVersion");
    await provider.synthesize(request, "device-1");
    expect(readVersion).toHaveBeenCalled();
    for (const [key] of readVersion.mock.calls) {
      expect(key).toMatch(/^speech-audio\/[a-f0-9]{64}$/);
      expect(key).not.toContain(request.text);
    }
  });

  it("não prende a frase em falha permanente e permite nova tentativa", async () => {
    const { provider, synthesize } = setup();
    synthesize.mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(provider.synthesize(request, "device-1")).rejects.toThrow();
    await expect(provider.synthesize(request, "device-2")).resolves.toMatchObject({
      audio: new Uint8Array([1, 2, 3]),
    });
  });
});
