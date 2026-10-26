import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { PaperRecoveryPage } from "./paper-recovery-page";
import NotFoundView from "../views/not-found-view";
import portuguese from "../../public/locales/pt-BR.json";
import english from "../../public/locales/en-US.json";

it("mostra a 404 sem exigir login e mantém uma saída direta", () => {
  const { container } = render(<NotFoundView />);
  expect(screen.getByRole("heading", { name: "Esta página saiu do mapa." })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Voltar ao início" }).getAttribute("href")).toBe("/");
  expect(container.querySelector(".paper-digits")?.textContent).toBe("404");
  expect(
    [...container.querySelectorAll(".paper-recovery__footer img")].map((image) =>
      image.getAttribute("src"),
    ),
  ).toEqual(["/olena-favicon-180.png", "/galeria-oli-icon.svg"]);
  expect(screen.queryByRole("button")).toBeNull();
});

it("não apresenta falha de inicialização como 404 e preserva a ação de tentar novamente", () => {
  const retry = vi.fn();
  const { container } = render(
    <PaperRecoveryPage
      title="Falha"
      description="Tente novamente"
      homeLabel="Voltar ao início"
      retryLabel="Tentar novamente"
      onRetry={retry}
    />,
  );
  expect(container.querySelector(".paper-digits")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(retry).toHaveBeenCalledOnce();
  expect(screen.getByRole("link", { name: "Voltar ao início" }).getAttribute("href")).toBe("/");
});

it("mantém a 404 estática independente dos chunks e alinhada aos dois catálogos", () => {
  const document = new DOMParser().parseFromString(
    readFileSync("public/404.html", "utf8"),
    "text/html",
  );
  expect(document.querySelector('a[href="/"]')).not.toBeNull();
  expect(
    [...document.querySelectorAll(".paper-recovery__footer img")].map((image) =>
      image.getAttribute("src"),
    ),
  ).toEqual(["/olena-favicon-180.png", "/galeria-oli-icon.svg"]);
  expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
    "noindex, follow",
  );
  expect(
    [...document.querySelectorAll("script")].map((script) => script.getAttribute("src")),
  ).toEqual(["/paper-recovery.js"]);
  for (const element of document.querySelectorAll("[data-recovery-en]")) {
    const index = portuguese.indexOf(element.textContent?.trim() ?? "");
    expect(index).toBeGreaterThanOrEqual(0);
    expect(english[index]).toBe(element.getAttribute("data-recovery-en"));
  }
});
