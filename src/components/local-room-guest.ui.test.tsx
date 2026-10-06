import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GUEST_NICKNAME_KEY } from "../domain/guest-session";
import { LocalRoom } from "./local-room";

function openJoinForm(props: { guest?: boolean; accountName?: string }) {
  render(<LocalRoom requireAccount {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /entrar com código/i }));
}

describe("apelido do convidado na sala", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("oferece o apelido começando em Guest e entra com ele", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "parar aqui" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    openJoinForm({ guest: true });
    const nickname = screen.getByLabelText("Seu apelido na sala") as HTMLInputElement;
    expect(nickname.value).toBe("Guest");
    expect(screen.getByText(/continua como Guest/)).toBeTruthy();

    fireEvent.change(nickname, { target: { value: "  Poli  " } });
    expect(localStorage.getItem(GUEST_NICKNAME_KEY)).toBe("Poli");
    fireEvent.change(screen.getByPlaceholderText("ABCDE"), { target: { value: "ABCDE" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const joinCall = fetchMock.mock.calls.find(([url]) => String(url).includes("action=join"));
    expect(JSON.parse(String(joinCall?.[1]?.body))).toMatchObject({
      code: "ABCDE",
      displayName: "Poli",
    });
  });

  it("volta a Guest quando o apelido é apagado, sem deixar entrar sem nome", () => {
    localStorage.setItem(GUEST_NICKNAME_KEY, "Poli");
    openJoinForm({ guest: true });
    const nickname = screen.getByLabelText("Seu apelido na sala") as HTMLInputElement;
    expect(nickname.value).toBe("Poli");
    fireEvent.change(nickname, { target: { value: "" } });
    expect(localStorage.getItem(GUEST_NICKNAME_KEY)).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("ABCDE"), { target: { value: "ABCDE" } });
    expect(screen.getByRole("button", { name: "Entrar" }).hasAttribute("disabled")).toBe(false);
  });

  it("não aparece para quem entrou com conta", () => {
    openJoinForm({ guest: true, accountName: "Ana" });
    expect(screen.queryByLabelText("Seu apelido na sala")).toBeNull();
    expect(screen.getByText("Ana")).toBeTruthy();
  });

  it("não aparece fora do modo convidado", () => {
    openJoinForm({ accountName: "Ana" });
    expect(screen.queryByLabelText("Seu apelido na sala")).toBeNull();
  });
});
