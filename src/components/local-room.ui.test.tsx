import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatRoomEstimatedDuration } from "../domain/local-room";
import { LocalRoom } from "./local-room";

describe("resumo da duração da sala", () => {
  it("inclui o feedback de três segundos por pergunta", () => {
    expect(formatRoomEstimatedDuration(3, 30)).toBe("1min39s");
  });
});

describe("chegada por link de convite", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pula a tela inicial e já mostra o formulário de entrar com o código preenchido", () => {
    render(<LocalRoom initialJoinCode="ABCDE" />);
    expect(screen.getByText(/entrar em uma sala/i)).toBeTruthy();
    expect((screen.getByLabelText(/código/i) as HTMLInputElement).value).toBe("ABCDE");
  });

  it("sem código de convite, mostra a tela inicial normal", () => {
    render(<LocalRoom accountName="Ana" />);
    expect(screen.getByText(/^modo sala$/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /criar sala/i })).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Atividades da sala" })).toBeTruthy();
    expect(screen.queryByLabelText("Código da sala")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Participantes" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: /entrar com código/i })).toBeNull();
  });

  it("prepara o minigame e as palavras sem criar nem alterar uma sala remota", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<LocalRoom accountName="Ana" />);
    const create = screen.getByRole("button", { name: /^Criar sala$/ });
    expect(create.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Selecionar exibidas" }));
    expect(screen.queryByRole("button", { name: "Aplicar seleção" })).toBeNull();
    await waitFor(() => expect(create.hasAttribute("disabled")).toBe(false));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(create.hasAttribute("disabled")).toBe(false);
  });

  it("normaliza o código colado e só libera a entrada com os dois campos válidos", () => {
    render(<LocalRoom accountName="Ana" initialJoinCode="ABCDE" />);

    const submit = screen.getByRole("button", { name: /^entrar$/i });
    fireEvent.paste(screen.getByLabelText(/código/i), {
      clipboardData: { getData: () => "ab-c de" },
    });
    expect(screen.queryByLabelText(/nome de exibição/i)).toBeNull();
    expect(screen.getByText("Ana")).toBeTruthy();

    expect((screen.getByLabelText(/código/i) as HTMLInputElement).value).toBe("ABCDE");
    expect(submit.hasAttribute("disabled")).toBe(false);
  });

  it("não usa apelido local quando a conta é obrigatória", () => {
    localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Apelido local" }));
    const { rerender } = render(<LocalRoom initialJoinCode="ABCDE" requireAccount />);
    expect(screen.getByRole("button", { name: /^Entrar$/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText("Apelido local")).toBeNull();
    rerender(<LocalRoom initialJoinCode="ABCDE" requireAccount accountName="Nome da conta" />);
    expect(screen.getByText("Nome da conta")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Entrar$/ }).hasAttribute("disabled")).toBe(false);
    localStorage.removeItem("helena.profile.v1");
  });
});
