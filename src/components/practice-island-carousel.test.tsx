import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PracticeIslandCarousel } from "./practice-island-carousel";

type FakeProps = {
  source: string;
  active: boolean;
  anchor: { x: number; y: number };
  onReadyChange?: (ready: boolean) => void;
  onShift?: (shift: { x: number; y: number }) => void;
};
const fakeProps: FakeProps[] = [];
vi.mock("./animated-island", () => ({
  AnimatedIsland: (props: FakeProps) => {
    fakeProps.push(props);
    return <i data-testid="animated-island" data-active={String(props.active)} />;
  },
}));

afterEach(() => {
  cleanup();
  fakeProps.length = 0;
});
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

const mathButton = () => screen.getByRole("button", { name: /Entrar em Picos dos Padrões/ });
const lastProps = () => fakeProps[fakeProps.length - 1]!;

it("anima só a ilha de Matemática, a partir da arte e do ponto do avatar", async () => {
  render(<PracticeIslandCarousel index={4} onVisit={() => {}} profile={{}} />);
  const island = await screen.findByTestId("animated-island");
  expect(island.getAttribute("data-active")).toBe("true");
  expect(screen.getAllByTestId("animated-island")).toHaveLength(1);
  expect(lastProps().source).toBe("/practice-islands/mathematics.webp");
  expect(lastProps().anchor).toEqual({ x: 0.54, y: 0.45 });
});

it("com a Matemática ao lado do mundo atual, ela existe mas fica inativa; longe, não existe", async () => {
  const view = render(<PracticeIslandCarousel index={3} onVisit={() => {}} profile={{}} />);
  expect((await screen.findByTestId("animated-island")).getAttribute("data-active")).toBe("false");
  view.rerender(<PracticeIslandCarousel index={0} onVisit={() => {}} profile={{}} />);
  expect(screen.queryByTestId("animated-island")).toBeNull();
});

it("a imagem parada só fica transparente depois que o primeiro quadro está pronto", async () => {
  render(<PracticeIslandCarousel index={4} onVisit={() => {}} profile={{}} />);
  await screen.findByTestId("animated-island");
  expect(mathButton().className).not.toContain("is-animated");
  act(() => lastProps().onReadyChange?.(true));
  expect(mathButton().className).toContain("is-animated");
  act(() => lastProps().onReadyChange?.(false));
  expect(mathButton().className).not.toContain("is-animated");
  // O texto alternativo da imagem continua no lugar para quem usa leitor de tela.
  expect(mathButton().querySelector("img")?.getAttribute("alt")).toBe("Mundo 5: Matemática");
});

it("o avatar acompanha o flutuar da ilha e volta ao lugar quando ela para", async () => {
  const view = render(<PracticeIslandCarousel index={4} onVisit={() => {}} profile={{}} />);
  await screen.findByTestId("animated-island");
  const avatar = view.container.querySelector<HTMLElement>(".practice-island-avatar")!;
  expect(avatar.style.translate).toBe("");
  act(() => lastProps().onShift?.({ x: 1.5, y: -4 }));
  expect(avatar.style.translate).toBe("1.5px -4px");
  act(() => lastProps().onShift?.({ x: 0, y: 0 }));
  expect(avatar.style.translate).toBe("");
});
