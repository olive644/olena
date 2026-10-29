import { afterEach, describe, expect, it, vi } from "vitest";
import { resetNotebook3dSupportForTests, supportsNotebook3d } from "./notebook-3d-support";

describe("supportsNotebook3d", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetNotebook3dSupportForTests();
  });

  it("fica no 2D quando o aparelho não tem a API de WebGL", () => {
    resetNotebook3dSupportForTests();
    expect(supportsNotebook3d()).toBe(false);
  });

  it("confere só a API, sem criar um contexto WebGL na abertura", () => {
    vi.stubGlobal("WebGL2RenderingContext", class {});
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
    resetNotebook3dSupportForTests();
    expect(supportsNotebook3d()).toBe(true);
    expect(getContext).not.toHaveBeenCalled();
  });
});
