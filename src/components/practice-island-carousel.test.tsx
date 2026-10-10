import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PracticeIslandCarousel } from "./practice-island-carousel";
afterEach(cleanup);
it("enters the available discipline by clicking its artwork while other disciplines stay locked", () => {
  const enter = vi.fn();
  const view = render(
    <PracticeIslandCarousel index={4} onVisit={() => {}} profile={{}} onEnter={enter} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Entrar em Picos dos Padrões" }));
  expect(enter).toHaveBeenCalledOnce();
  view.rerender(
    <PracticeIslandCarousel index={3} onVisit={() => {}} profile={{}} onEnter={enter} />,
  );
  const locked = screen.getByRole("button", { name: /Entrar em Jardim/ });
  expect(locked.hasAttribute("disabled")).toBe(true);
  fireEvent.click(locked);
  expect(enter).toHaveBeenCalledOnce();
});
