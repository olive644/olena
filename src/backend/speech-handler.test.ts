import { describe, expect, it, vi } from "vitest";
import { createSpeechHandler, type SpeechHandlerDependencies } from "./speech-handler";

const origin = "https://helena.example";
const validRequest = { text: "Hello", rate: 0.86, consent: true } as const;

function dependencies(): SpeechHandlerDependencies {
  return {
    identifyClient: () => "test-client",
    rateLimiter: { consume: vi.fn().mockResolvedValue(true) },
    provider: {
      synthesize: vi
        .fn()
        .mockResolvedValue({ audio: new Uint8Array([82, 73, 70, 70]), contentType: "audio/wav" }),
    },
  };
}

function post(body: unknown, requestOrigin = origin): Request {
  return new Request(`${origin}/api/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: requestOrigin },
    body: JSON.stringify(body),
  });
}

describe("handler de voz", () => {
  it("valida e devolve somente áudio", async () => {
    const deps = dependencies();
    const response = await createSpeechHandler(deps)(post(validRequest));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/wav");
    expect(deps.provider.synthesize).toHaveBeenCalledWith(validRequest, "test-client");
  });

  it("bloqueia outra origem e exige consentimento", async () => {
    const deps = dependencies();
    expect(
      (await createSpeechHandler(deps)(post(validRequest, "https://attacker.example"))).status,
    ).toBe(403);
    expect(
      (await createSpeechHandler(deps)(post({ ...validRequest, consent: false }))).status,
    ).toBe(400);
    expect(
      (await createSpeechHandler(deps)(post({ ...validRequest, voice: "Charon" }))).status,
    ).toBe(400);
    expect(
      (await createSpeechHandler(deps)(post({ ...validRequest, roomCode: "not a room" }))).status,
    ).toBe(400);
    expect(deps.provider.synthesize).not.toHaveBeenCalled();
  });

  it("limita uso e esconde falhas do provedor", async () => {
    const limited = dependencies();
    limited.rateLimiter.consume = vi.fn().mockResolvedValue(false);
    expect((await createSpeechHandler(limited)(post(validRequest))).status).toBe(429);

    const unavailable = dependencies();
    unavailable.provider.synthesize = vi.fn().mockRejectedValue(new Error("segredo"));
    const response = await createSpeechHandler(unavailable)(post(validRequest));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("segredo");
  });

  it("exige credencial e proteção para áudio da sala sem repassar segredo ao provedor", async () => {
    const deps = dependencies();
    deps.authorizeRoom = vi.fn().mockResolvedValue(true);
    deps.guardRoomRequest = vi.fn().mockResolvedValue(undefined);
    const handler = createSpeechHandler(deps);
    const roomRequest = {
      ...validRequest,
      rate: 1,
      roomCode: "ABCDE",
      roomCredential: "room-secret",
    };

    expect((await handler(post({ ...validRequest, roomCode: "ABCDE" }))).status).toBe(400);
    expect((await handler(post({ ...roomRequest, rate: 0.75 }))).status).toBe(400);
    expect((await handler(post(roomRequest))).status).toBe(200);
    expect(deps.authorizeRoom).toHaveBeenCalledWith("ABCDE", "room-secret", "Hello");
    expect(deps.provider.synthesize).toHaveBeenCalledWith(
      { ...validRequest, rate: 1, roomCode: "ABCDE" },
      "test-client",
    );
    expect(JSON.stringify(vi.mocked(deps.provider.synthesize).mock.calls)).not.toContain(
      "room-secret",
    );

    deps.authorizeRoom = vi.fn().mockResolvedValue(false);
    expect((await createSpeechHandler(deps)(post(roomRequest))).status).toBe(403);
    deps.guardRoomRequest = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    expect((await createSpeechHandler(deps)(post(roomRequest))).status).toBe(403);
    deps.guardRoomRequest = vi.fn().mockRejectedValue(new Error("private failure"));
    const guardFailure = await createSpeechHandler(deps)(post(roomRequest));
    expect(guardFailure.status).toBe(503);
    expect(await guardFailure.text()).not.toContain("private failure");
    expect(deps.provider.synthesize).toHaveBeenCalledTimes(1);
  });
});
