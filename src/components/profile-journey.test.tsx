import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProfileJourney } from "./profile-journey";
import { profileCompletion } from "../domain/profile-completion";

afterEach(cleanup);
it("não renderiza nada quando a Olena não encontra pendências", () => {
  const completion = profileCompletion(
    { name: "Oli", photoUrl: "/profile-avatars/helena.webp", cover: "ocean" },
    "oli",
  );
  const { container } = render(
    <ProfileJourney completion={completion} onChoose={vi.fn()} onDismiss={vi.fn()} />,
  );
  expect(container.childElementCount).toBe(0);
  expect(screen.queryByText("Revisar meu perfil")).toBeNull();
});
it("recomenda somente a etapa pendente e abre o editor correspondente", () => {
  const choose = vi.fn();
  const completion = profileCompletion({ name: "Oli", cover: "ocean" }, "oli");
  render(<ProfileJourney completion={completion} onChoose={choose} onDismiss={vi.fn()} />);
  expect(screen.getByText("FALTA 1 ETAPA")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Quem é você?" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Seu pequeno universo" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Escolher personagem" }));
  expect(choose).toHaveBeenCalledWith("avatar");
});
it("permite dispensar uma recomendação", () => {
  const dismiss = vi.fn();
  render(
    <ProfileJourney
      completion={profileCompletion({}, "")}
      onChoose={vi.fn()}
      onDismiss={dismiss}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Dispensar recomendação de perfil" }));
  expect(dismiss).toHaveBeenCalledOnce();
});
it("remove toda a árvore assim que as etapas forem concluídas", () => {
  const { rerender, container } = render(
    <ProfileJourney
      completion={profileCompletion({}, "")}
      onChoose={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  expect(screen.getByRole("region", { name: "Complete seu perfil" })).toBeTruthy();
  rerender(
    <ProfileJourney
      completion={profileCompletion(
        { name: "Oli", photoUrl: "/profile-avatars/helena.webp", cover: "ocean" },
        "oli",
      )}
      onChoose={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  expect(container.childElementCount).toBe(0);
});
