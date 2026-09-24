import { describe, expect, it } from "vitest";
import { readLocalRoomProjectorCodeFromUrl } from "./room-code";

describe("rota do projetor", () => {
  it("lê o código da rota dedicada", () => {
    expect(
      readLocalRoomProjectorCodeFromUrl("https://olenastudy.vercel.app/sala/9akzh/projetor"),
    ).toBe("9AKZH");
  });

  it("ignora rotas e códigos inválidos", () => {
    expect(
      readLocalRoomProjectorCodeFromUrl("https://olenastudy.vercel.app/?sala=9AKZH"),
    ).toBeUndefined();
    expect(
      readLocalRoomProjectorCodeFromUrl("https://olenastudy.vercel.app/sala/00000/projetor"),
    ).toBeUndefined();
  });
});
