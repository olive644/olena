import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BRAND_FOOTER_ICON, BRAND_FOOTER_TEXT, BrandFooter } from "./brand-footer";

describe("rodapé da marca", () => {
  it("mostra o texto de direitos da Galeria.Oli", () => {
    render(<BrandFooter />);
    expect(BRAND_FOOTER_TEXT).toBe("Todos os direitos Galeria.Oli - OlenaStudy");
    expect(screen.getByText("Todos os direitos Galeria.Oli - OlenaStudy")).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("põe o ícone à esquerda do texto e o mantém fora da leitura por voz", () => {
    const { container } = render(<BrandFooter />);
    const footer = container.querySelector("footer")!;
    const [first, second] = Array.from(footer.children);
    expect(first?.tagName).toBe("IMG");
    expect(second?.tagName).toBe("SPAN");
    const icon = first as HTMLImageElement;
    expect(icon.getAttribute("src")).toBe(BRAND_FOOTER_ICON);
    expect(icon.getAttribute("alt")).toBe("");
    expect(icon.getAttribute("width")).toBe("30");
    expect(icon.getAttribute("height")).toBe("30");
  });

  it("não usa travessão, só hífen, como as regras do repositório pedem", () => {
    expect(BRAND_FOOTER_TEXT).not.toMatch(/[–—]/);
  });
});
