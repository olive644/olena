import { roomAppCheckToken } from "./room-app-check";

export const MAX_ROOM_RECORDING_BYTES = 256_000;

async function requestRecording(
  action: "upload" | "play",
  body: Record<string, unknown>,
): Promise<Response> {
  const token = await roomAppCheckToken();
  const response = await fetch(`/api/room-recording?action=${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Firebase-AppCheck": token } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(result.error ?? "Não foi possível acessar a gravação.");
  }
  return response;
}

export async function uploadRoomRecording(
  code: string,
  credential: string,
  blob: Blob,
): Promise<string> {
  if (!blob.size || blob.size > MAX_ROOM_RECORDING_BYTES)
    throw new Error("Use uma gravação de até 256 KB.");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 16_384)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16_384));
  const response = await requestRecording("upload", {
    code,
    credential,
    audio: btoa(binary),
    contentType: blob.type,
  });
  const result = (await response.json()) as { audioId: string };
  return result.audioId;
}

export async function loadRoomRecording(
  code: string,
  credential: string,
  questionIndex: number,
): Promise<Blob> {
  const response = await requestRecording("play", { code, credential, questionIndex });
  return response.blob();
}
