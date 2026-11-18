import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsFooter } from "./settings-footer";

describe("rodapé das Configurações", () => {
  it("aponta para os perfis oficiais do OlenaStudy", () => {
    render(<SettingsFooter />);
    expect(screen.getByRole("link", { name: "Instagram" }).getAttribute("href")).toBe(
      "https://www.instagram.com/olenastudy.app/",
    );
    // O perfil @olena.app não existe: o do OlenaStudy é @olenastudy.app.
    expect(screen.getByRole("link", { name: "TikTok" }).getAttribute("href")).toBe(
      "https://www.tiktok.com/@olenastudy.app",
    );
  });
});
