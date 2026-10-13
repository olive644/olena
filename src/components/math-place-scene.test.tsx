import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MathPlaceScene } from "./math-place-scene";

type FakeProps = { course: string; active: boolean; onReadyChange: (ready: boolean) => void };
const fakeProps: FakeProps[] = [];
vi.mock("./animated-place", () => ({
  AnimatedPlace: (props: FakeProps) => {
    fakeProps.push(props);
    return <i data-testid="animated-place" data-course={props.course} />;
  },
}));

afterEach(() => {
  cleanup();
  fakeProps.length = 0;
});

const picture = (view: { container: HTMLElement }) =>
  view.container.querySelector<HTMLImageElement>("img.math-place-scene")!;

it("sem animate, só a imagem parada aparece e nada é carregado", () => {
  const view = render(<MathPlaceScene course="school" />);
  expect(picture(view).getAttribute("src")).toBe("/math-islands/places/school.webp");
  expect(screen.queryByTestId("animated-place")).toBeNull();
  expect(fakeProps).toHaveLength(0);
});

it("com animate, monta a animação do lugar certo e repassa se ele está ativo", async () => {
  const view = render(<MathPlaceScene course="calculus2" active={false} animate />);
  expect((await screen.findByTestId("animated-place")).getAttribute("data-course")).toBe(
    "calculus2",
  );
  expect(fakeProps[0]?.active).toBe(false);
  expect(picture(view).getAttribute("aria-hidden")).toBe("true");
});

it("a imagem só fica transparente depois do primeiro quadro e volta se a animação cair", async () => {
  const view = render(<MathPlaceScene course="foundations" animate />);
  await screen.findByTestId("animated-place");
  expect(picture(view).className).toBe("math-place-scene");
  act(() => fakeProps[fakeProps.length - 1]?.onReadyChange(true));
  expect(picture(view).className).toBe("math-place-scene is-animated");
  act(() => fakeProps[fakeProps.length - 1]?.onReadyChange(false));
  expect(picture(view).className).toBe("math-place-scene");
});
