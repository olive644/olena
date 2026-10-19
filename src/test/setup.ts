import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import portuguese from "../../public/locales/pt-BR.json";
import { installUiCatalog } from "../i18n/runtime";

installUiCatalog("pt-BR", portuguese);

beforeEach(() => {
  // jsdom não executa rolagem; os testes de navegador validam o comportamento real.
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hidePopover = vi.fn();
  // jsdom não toca áudio: os sons só precisam devolver a promessa que o navegador devolve.
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});
