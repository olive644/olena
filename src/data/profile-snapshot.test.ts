import { afterEach, describe, expect, it } from "vitest";
import { readProfileSnapshot, writeProfileSnapshot } from "./profile-snapshot";

afterEach(() => localStorage.clear());

describe("foto do Perfil guardada no aparelho", () => {
  it("devolve o @ e os contadores só para a conta dona do aparelho", () => {
    localStorage.setItem("helena.account.v1", "conta-a");
    writeProfileSnapshot("conta-a", { username: "ana", followers: 3, following: 2 });
    expect(readProfileSnapshot()).toEqual({
      uid: "conta-a",
      username: "ana",
      followers: 3,
      following: 2,
    });
    localStorage.setItem("helena.account.v1", "conta-b");
    expect(readProfileSnapshot()).toBeUndefined();
    expect(readProfileSnapshot("conta-a")?.username).toBe("ana");
  });

  it("junta campos da mesma conta e recomeça quando a conta muda", () => {
    localStorage.setItem("helena.account.v1", "conta-a");
    writeProfileSnapshot("conta-a", { username: "ana" });
    writeProfileSnapshot("conta-a", { followers: 5 });
    expect(readProfileSnapshot()).toEqual({ uid: "conta-a", username: "ana", followers: 5 });
    writeProfileSnapshot("conta-b", { following: 1 });
    expect(readProfileSnapshot("conta-a")).toBeUndefined();
    expect(readProfileSnapshot("conta-b")).toEqual({ uid: "conta-b", following: 1 });
  });

  it("descarta conteúdo ilegível ou fora do formato, sem lançar erro", () => {
    localStorage.setItem("helena.account.v1", "conta-a");
    for (const raw of ["não é json", "null", "[]", '{"uid":""}', '{"uid":7}']) {
      localStorage.setItem("helena.profileSnapshot.v1", raw);
      expect(readProfileSnapshot()).toBeUndefined();
    }
    localStorage.setItem(
      "helena.profileSnapshot.v1",
      JSON.stringify({
        uid: "conta-a",
        username: "<script>",
        followers: -1,
        following: 1.5,
        creks: true,
      }),
    );
    expect(readProfileSnapshot()).toEqual({ uid: "conta-a" });
  });

  it("é apagada junto com os dados pessoais, ao sair ou trocar de conta", async () => {
    const { clearPersonalData } = await import("./personal-data");
    localStorage.setItem("helena.account.v1", "conta-a");
    writeProfileSnapshot("conta-a", { username: "ana" });
    clearPersonalData(localStorage);
    expect(localStorage.getItem("helena.profileSnapshot.v1")).toBeNull();
  });
});
