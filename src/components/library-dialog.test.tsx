import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LibraryDialog } from "./library-dialog";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});
it("anuncia o título ao abrir e devolve o foco ao controle anterior", () => {
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute("open");
  });
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  const view = render(
    <LibraryDialog title="Caderno" onClose={() => undefined}>
      <p>Conteúdo</p>
    </LibraryDialog>,
  );
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Caderno" }));
  expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Fechar" }));
  view.unmount();
  expect(document.activeElement).toBe(trigger);
});
