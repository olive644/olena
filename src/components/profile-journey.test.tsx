import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProfileJourney } from "./profile-journey";

afterEach(cleanup);
it("não cobra etapas preenchidas enquanto a API confere em segundo plano", () => {
  const profile = {
    name: "Oli",
    photoUrl: "/profile-avatars/helena.webp",
    cover: "ocean" as const,
  };
  const { rerender } = render(
    <ProfileJourney profile={profile} username="oli" onChoose={vi.fn()} verification="pending" />,
  );
  expect(screen.getByRole("heading", { name: "Seu perfil está perfeito." })).toBeTruthy();
  expect(screen.queryByRole("list", { name: "Etapas do perfil" })).toBeNull();
  rerender(
    <ProfileJourney profile={profile} username="oli" onChoose={vi.fn()} verification="offline" />,
  );
  expect(screen.queryByText("CONFIRMAÇÃO PENDENTE")).toBeNull();
  rerender(
    <ProfileJourney profile={profile} username="oli" onChoose={vi.fn()} verification="confirmed" />,
  );
  expect(screen.getByRole("heading", { name: "Seu perfil está perfeito." })).toBeTruthy();
});
it("encaminha a etapa pendente para o editor correto e não aceita @ não confirmado", () => {
  const choose = vi.fn();
  const { rerender } = render(
    <ProfileJourney profile={{ name: "Oli", username: "legado" }} username="" onChoose={choose} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Escolher meu nome" }));
  expect(choose).toHaveBeenLastCalledWith("identity");
  rerender(<ProfileJourney profile={{ name: "Oli" }} username="oli" onChoose={choose} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher personagem" }));
  expect(choose).toHaveBeenLastCalledWith("avatar");
  rerender(
    <ProfileJourney
      profile={{ name: "Oli", photoUrl: "/profile-avatars/helena.webp" }}
      username="oli"
      onChoose={choose}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Escolher minha capa" }));
  expect(choose).toHaveBeenLastCalledWith("cover");
});
it("celebra sem obrigar bio, pronomes ou redes e permite revisitar etapas", () => {
  const choose = vi.fn();
  const { container } = render(
    <ProfileJourney
      profile={{ name: "Oli", photoUrl: "/profile-avatars/helena.webp", cover: "ocean" }}
      username="oli"
      onChoose={choose}
    />,
  );
  expect(screen.getByRole("heading", { name: "Seu perfil está perfeito." })).toBeTruthy();
  expect(container.querySelector("img")?.getAttribute("src")).toBe(
    "/profile-journey/helena-complete.webp",
  );
  fireEvent.click(screen.getByRole("button", { name: "Revisar meu perfil" }));
  expect(choose).toHaveBeenCalledWith("identity");
});

it("não pede para preencher o nome antes de carregar a identidade confirmada", () => {
  render(
    <ProfileJourney
      profile={{ name: "Oli", username: "oli" }}
      username=""
      verification="pending"
      onChoose={vi.fn()}
    />,
  );
  expect(screen.getByRole("heading", { name: "Carregando seu perfil" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Escolher meu nome" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Quem é você?" })).toBeNull();
});

it("atualizações repetidas substituem o conteúdo sem acumular títulos ou imagens", () => {
  const complete = {
    name: "Oli",
    photoUrl: "/profile-avatars/helena.webp",
    cover: "ocean" as const,
  };
  const { rerender, container } = render(
    <ProfileJourney profile={{}} username="" verification="pending" onChoose={vi.fn()} />,
  );
  for (let index = 0; index < 8; index++) {
    rerender(
      <ProfileJourney
        profile={index % 2 ? complete : { name: "Oli" }}
        username="oli"
        verification={index % 2 ? "confirmed" : "pending"}
        onChoose={vi.fn()}
      />,
    );
    expect(container.querySelectorAll("h2")).toHaveLength(1);
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.querySelectorAll(".profile-journey")).toHaveLength(1);
  }
  expect(screen.queryByText("Quem é você?")).toBeNull();
});
