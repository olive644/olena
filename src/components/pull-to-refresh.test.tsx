import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PullToRefresh } from "./pull-to-refresh";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function gesture(target: Element, dx: number, dy: number, end = true) {
  fireEvent.touchStart(target, { touches: [{ clientX: 30, clientY: 20 }] });
  fireEvent.touchMove(target, { touches: [{ clientX: 30 + dx, clientY: 20 + dy }] });
  if (end) fireEvent.touchEnd(target, { touches: [] });
}
it("cancela puxada curta e atualiza somente depois de soltar além do limite", () => {
  const refresh = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  const view = render(
    <>
      <PullToRefresh refresh={refresh} />
      <main>Conteúdo</main>
    </>,
  );
  const main = view.container.querySelector("main")!;
  gesture(main, 0, 80);
  expect(screen.queryByRole("status")).toBeNull();
  expect(refresh).not.toHaveBeenCalled();
  gesture(main, 0, 220, false);
  expect(screen.getByRole("status").textContent).toBe("Solte para atualizar");
  expect(refresh).not.toHaveBeenCalled();
  act(() => {
    fireEvent.touchEnd(main, { touches: [] });
  });
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status").textContent).toBe("Atualizando…");
  gesture(main, 0, 220);
  expect(refresh).toHaveBeenCalledTimes(1);
});
it("preserva gestos horizontais, campos, rolagem e diálogos", () => {
  const refresh = vi.fn();
  const view = render(
    <>
      <PullToRefresh refresh={refresh} />
      <main>
        <input />
        <div role="dialog" />
      </main>
    </>,
  );
  const main = view.container.querySelector("main")!;
  gesture(main, 0, 240);
  expect(screen.queryByRole("status")).toBeNull();
  view.container.querySelector('[role="dialog"]')!.remove();
  gesture(main, 240, 30);
  gesture(view.container.querySelector("input")!, 0, 240);
  vi.stubGlobal("scrollY", 100);
  gesture(main, 0, 240);
  expect(refresh).not.toHaveBeenCalled();
  expect(screen.queryByRole("status")).toBeNull();
});
it("cancela multitouch e touchcancel e limpa a contenção ao sair", () => {
  const view = render(
    <>
      <PullToRefresh />
      <main />
    </>,
  );
  const main = view.container.querySelector("main")!;
  gesture(main, 0, 220, false);
  expect(screen.getByRole("status")).toBeTruthy();
  fireEvent.touchCancel(main);
  expect(screen.queryByRole("status")).toBeNull();
  gesture(main, 0, 220, false);
  fireEvent.touchMove(main, {
    touches: [
      { clientX: 30, clientY: 240 },
      { clientX: 80, clientY: 240 },
    ],
  });
  expect(screen.queryByRole("status")).toBeNull();
  view.unmount();
  expect(document.documentElement.classList.contains("paper-refresh-enabled")).toBe(false);
});
