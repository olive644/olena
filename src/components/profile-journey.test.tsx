import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProfileJourney } from "./profile-journey";

afterEach(cleanup);
it("não anuncia confirmação final sem a conferência da API", () => {
  const profile = {
    name: "Oli",
    photoUrl: "/profile-avatars/helena.webp",
    cover: "ocean" as const,
  };
  const { rerender } = render(
    <ProfileJourney profile={profile} username="oli" onChoose={vi.fn()} verification="pending" />,
  );
  expect(screen.queryByRole("heading", { name: "Seu perfil está perfeito." })).toBeNull();
  expect(screen.getByText("CONFERINDO COM A OLENA")).toBeTruthy();
  rerender(
    <ProfileJourney profile={profile} username="oli" onChoose={vi.fn()} verification="offline" />,
  );
  expect(screen.getByText("CONFIRMAÇÃO PENDENTE")).toBeTruthy();
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
  fireEvent.click(screen.getByRole("button", { name: "Quem é você? Concluído" }));
  expect(choose).toHaveBeenCalledWith("identity");
});
