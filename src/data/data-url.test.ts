import { describe, expect, it } from "vitest";
import { dataUrlBytes } from "./data-url";

describe("dataUrlBytes", () => {
  it("decodifica um PDF em base64", () => {
    const bytes = dataUrlBytes("data:application/pdf;base64,JVBERi0xLjQK");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(bytes)).toBe("%PDF-1.4\n");
  });

  it("ignora quebras de linha dentro do base64", () => {
    expect(new TextDecoder().decode(dataUrlBytes("data:text/plain;base64,SGVs\nbG8="))).toBe(
      "Hello",
    );
  });

  it("recusa o que não é base64 ou está corrompido", () => {
    expect(dataUrlBytes("https://exemplo.com/a.pdf")).toBeUndefined();
    expect(dataUrlBytes("data:text/plain,Ola")).toBeUndefined();
    expect(dataUrlBytes("data:application/pdf;base64,@@@")).toBeUndefined();
  });
});
