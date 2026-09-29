import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NaturalVoicePlayer, type NaturalVoiceState } from "./listening-audio";

function jsonResponse(status: number, headers: Record<string, string> = {}) {
  return new Response(new Blob(["audio"]), { status, headers });
}

beforeEach(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:fake"),
    revokeObjectURL: vi.fn(),
  });
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function collectStates(): { states: NaturalVoiceState[]; player: NaturalVoicePlayer } {
  const states: NaturalVoiceState[] = [];
  // Com aceite: é o caso em que o áudio realmente é pedido ao serviço de voz.
  const player = new NaturalVoicePlayer(
    (state) => states.push(state),
    () => true,
  );
  return { states, player };
}

describe("NaturalVoicePlayer", () => {
  it("reproduz o audio quando o servico responde com sucesso", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { "X-TTS-Provider": "kokoro" })),
    );
    const { states, player } = collectStates();

    await player.generate("hello", 0.86);

    expect(states.map((s) => s.status)).toEqual(["generating", "playing"]);
  });

  it("avisa quando o audio veio de uma voz alternativa (Piper)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { "X-TTS-Provider": "piper" })),
    );
    const { states, player } = collectStates();

    await player.generate("hello", 0.86);

    expect(states.some((s) => s.message === "Usando voz alternativa.")).toBe(true);
  });

  it("chama o fallback e avisa sobre a voz do dispositivo quando o servico falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(503)));
    const { states, player } = collectStates();
    const fallback = vi.fn();

    await player.generate("hello", 0.86, fallback);

    expect(fallback).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toEqual({ status: "error", message: "Usando a voz do dispositivo." });
  });

  it("na sala, não usa a voz do aparelho e permite tentar novamente após falha", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(200, { "X-TTS-Provider": "kokoro" }));
    vi.stubGlobal("fetch", fetchMock);
    const { states, player } = collectStates();

    await player.generate("hello", 1);
    expect(states.at(-1)).toEqual({
      status: "error",
      message: "Áudio indisponível. Toque para tentar novamente.",
    });
    await player.generate("hello", 1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(states.at(-1)?.status).toBe("playing");
  });

  it("quando o celular bloqueia autoplay, pede um toque e aproveita o áudio já baixado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);
    HTMLMediaElement.prototype.play = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"))
      .mockResolvedValueOnce(undefined);
    const { states, player } = collectStates();

    expect(await player.generate("hello", 1)).toBe(false);
    expect(states.at(-1)?.message).toContain("Toque para ouvir");
    expect(await player.generate("hello", 1)).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("inclui o código da sala somente no pedido de áudio compartilhado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);
    const player = new NaturalVoicePlayer(
      () => undefined,
      () => true,
      () => "ABCDE",
    );
    await player.generate("hello", 1);
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toEqual({ text: "hello", rate: 1, consent: true, roomCode: "ABCDE" });
  });

  it("cancela a reproducao anterior quando generate e chamado de novo antes de terminar", async () => {
    let resolveFirst: (() => void) | undefined;
    const firstFetch = new Promise<Response>((resolve) => {
      resolveFirst = () => resolve(jsonResponse(200, { "X-TTS-Provider": "kokoro" }));
    });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => firstFetch)
      .mockResolvedValueOnce(jsonResponse(200, { "X-TTS-Provider": "kokoro" }));
    vi.stubGlobal("fetch", fetchMock);
    const { states, player } = collectStates();

    const firstGenerate = player.generate("word one", 0.86);
    const secondGenerate = player.generate("word two", 0.86);
    resolveFirst?.();
    await Promise.all([firstGenerate, secondGenerate]);

    const playingCount = states.filter((s) => s.status === "playing").length;
    expect(playingCount).toBe(1);
  });
});

describe("NaturalVoicePlayer sem aceite", () => {
  it("nunca chama a rede e usa a voz do aparelho", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const states: NaturalVoiceState[] = [];
    const player = new NaturalVoicePlayer((state) => states.push(state));
    const fallback = vi.fn();

    await player.generate("hello", 1, fallback);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledOnce();
    expect(states).toEqual([{ status: "idle" }]);
  });

  it("não pré-carrega o áudio da próxima frase", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    new NaturalVoicePlayer(() => undefined).preload("hello", 1);
    new NaturalVoicePlayer(
      () => undefined,
      () => false,
    ).preload("hello", 1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passa a usar a rede no mesmo jogador assim que o aceite é dado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { "X-TTS-Provider": "kokoro" }));
    vi.stubGlobal("fetch", fetchMock);
    let allowed = false;
    const player = new NaturalVoicePlayer(
      () => undefined,
      () => allowed,
    );
    await player.generate("hello", 1, vi.fn());
    expect(fetchMock).not.toHaveBeenCalled();
    allowed = true;
    await player.generate("hello", 1, vi.fn());
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toEqual({ text: "hello", rate: 1, consent: true });
  });
});
