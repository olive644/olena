import { describe, expect, it } from "vitest";
import { fileMatchesAllowedType, sniffFileKind } from "./file-signature";

const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
const jpeg = Uint8Array.from([255, 216, 255, 224, 0, 16, 74, 70]);
const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
const pdf = new TextEncoder().encode("%PDF-1.7\n1 0 obj");
const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
const file = (bytes: Uint8Array, type: string) =>
  new File([bytes as BlobPart], "arquivo", { type });

describe("assinatura de arquivos enviados", () => {
  it("reconhece PNG, JPEG, WebP e PDF pelos primeiros bytes", async () => {
    expect(await sniffFileKind(file(png, "image/png"))).toBe("png");
    expect(await sniffFileKind(file(jpeg, "image/jpeg"))).toBe("jpeg");
    expect(await sniffFileKind(file(webp, "image/webp"))).toBe("webp");
    expect(await sniffFileKind(file(pdf, "application/pdf"))).toBe("pdf");
  });

  it("recusa HTML, SVG e arquivo vazio que se declaram imagem", async () => {
    expect(await sniffFileKind(file(html, "image/png"))).toBeUndefined();
    expect(await sniffFileKind(file(svg, "image/png"))).toBeUndefined();
    expect(await sniffFileKind(file(new Uint8Array(), "image/png"))).toBeUndefined();
    expect(await fileMatchesAllowedType(file(html, "image/png"), ["png"])).toBe(false);
  });

  it("exige que o tipo informado combine com o conteúdo", async () => {
    expect(await fileMatchesAllowedType(file(png, "image/png"), ["png", "jpeg"])).toBe(true);
    expect(await fileMatchesAllowedType(file(jpeg, "image/png"), ["png", "jpeg"])).toBe(false);
    expect(await fileMatchesAllowedType(file(pdf, "image/png"), ["png"])).toBe(false);
  });

  it("só aceita os tipos permitidos pela tela", async () => {
    expect(await fileMatchesAllowedType(file(pdf, "application/pdf"), ["png"])).toBe(false);
    expect(await fileMatchesAllowedType(file(pdf, "application/pdf"), ["png", "pdf"])).toBe(true);
  });

  it("aceita PDF com lixo antes do cabeçalho, como os leitores", async () => {
    const noisy = new TextEncoder().encode("\n\n   %PDF-1.4 conteudo");
    expect(await sniffFileKind(file(noisy, "application/pdf"))).toBe("pdf");
  });
});
