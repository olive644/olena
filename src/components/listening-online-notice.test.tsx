import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListeningOnlineNotice } from "./listening-online-notice";

afterEach(cleanup);

describe("aviso da voz natural e do vocabulário online", () => {
  it("sem escolha, explica o que sai do aparelho e pede permissão", () => {
    const onChoose = vi.fn();
    render(<ListeningOnlineNotice choice={null} onChoose={onChoose} />);
    expect(screen.getByRole("heading", { name: /Voz natural e vocabulário online/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /política/i }).getAttribute("rel")).toContain(
      "noopener",
    );
    fireEvent.click(screen.getByRole("button", { name: "Permitir" }));
    expect(onChoose).toHaveBeenCalledWith("accepted");
    fireEvent.click(screen.getByRole("button", { name: "Agora não" }));
    expect(onChoose).toHaveBeenCalledWith("declined");
  });

  it("com escolha feita, mostra o estado e deixa mudar de ideia", () => {
    const onChoose = vi.fn();
    const { rerender } = render(<ListeningOnlineNotice choice="accepted" onChoose={onChoose} />);
    expect(screen.getByRole("status").textContent).toContain("ativados");
    fireEvent.click(screen.getByRole("button", { name: "Desativar" }));
    expect(onChoose).toHaveBeenCalledWith("declined");
    rerender(<ListeningOnlineNotice choice="declined" onChoose={onChoose} />);
    expect(screen.getByRole("status").textContent).toContain("voz do seu aparelho");
    fireEvent.click(screen.getByRole("button", { name: "Ativar" }));
    expect(onChoose).toHaveBeenCalledWith("accepted");
  });
});
