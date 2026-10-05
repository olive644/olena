import { describe, expect, it } from "vitest";
import { roomCodeFromQr } from "./room-qr-invite";

describe("convite lido pela câmera", () => {
  const origin = "https://preview.example";
  it.each([
    "abcde",
    "AB-CDE",
    `${origin}/sala?sala=ABCDE`,
    "https://olenastudy.vercel.app/sala?sala=ABCDE",
  ])("aceita código ou convite do Olena: %s", (value) => {
    expect(roomCodeFromQr(value, origin)).toBe("ABCDE");
  });
  it.each([
    "https://phishing.example/?sala=ABCDE",
    "javascript:alert(1)",
    "https://olenastudy.vercel.app.evil.example/?sala=ABCDE",
    "12345",
    "texto sem convite",
    `${origin}/sala?sala=invalid`,
  ])("não navega nem aceita QR externo ou inválido: %s", (value) => {
    expect(roomCodeFromQr(value, origin)).toBeUndefined();
  });
});
