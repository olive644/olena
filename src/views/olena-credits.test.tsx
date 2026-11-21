import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HelenaUsage } from "../data/helena-client";
import { OlenaCreditMeter } from "./olena-credits";
import { useOlenaCredits } from "./use-olena-credits";

const services = vi.hoisted(() => vi.fn());
const fetchUsage = vi.hoisted(() => vi.fn());
const playSpend = vi.hoisted(() => vi.fn());
const reduced = vi.hoisted(() => vi.fn(() => false));
vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: services }));
vi.mock("../data/helena-client", () => ({ fetchHelenaUsage: fetchUsage }));
vi.mock("../data/credit-sound", () => ({ playCreditSpendSound: playSpend }));
vi.mock("../data/room-feedback-sound", () => ({ prepareRoomFeedbackSound: () => undefined }));
vi.mock("../data/reduced-motion", () => ({ reducedMotion: reduced }));

const usage = (used: number): HelenaUsage => ({
  usedCredits: used,
  limitCredits: 480,
  remainingCredits: 480 - used,
  requestMaxCredits: 300,
  resetInSeconds: 4 * 3600 + 12 * 60,
});

beforeEach(() => {
  services.mockResolvedValue({
    auth: { currentUser: { isAnonymous: false, getIdToken: async () => "token" } },
  });
  reduced.mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("medidor de créditos da Olena", () => {
  const later = Date.now() + (4 * 3600 + 12 * 60) * 1000;

  it("não aparece sem saldo (sem conta ou sem rede)", () => {
    const { container } = render(
      <OlenaCreditMeter usage={undefined} resetAt={0} spend={undefined} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("mostra o saldo real com dígitos originais no cabeçalho compacto", () => {
    const { container } = render(<OlenaCreditMeter compact usage={usage(80)} resetAt={later} spend={undefined} />);
    expect(container.querySelector(".olena-credits--compact .paper-digits")).not.toBeNull();
    expect(screen.getByRole("group", { name: "Créditos da Olena" })).not.toBeNull();
  });

  it("mostra o saldo, o limite e quando renova", () => {
    render(<OlenaCreditMeter usage={usage(80)} resetAt={later} spend={undefined} />);
    const meter = screen.getByRole("group", { name: "Créditos da Olena" });
    expect(meter.textContent).toContain("400");
    expect(meter.textContent).toContain("/ 480");
    expect(meter.textContent).toMatch(/Renova em 4 h 1[12] min/);
    expect(meter.getAttribute("data-level")).toBe("ok");
  });

  it("avisa com texto, não só com cor, quando o saldo não cobre um pedido grande e quando acaba", () => {
    const { rerender } = render(
      <OlenaCreditMeter usage={usage(400)} resetAt={later} spend={undefined} />,
    );
    expect(screen.getByRole("group").getAttribute("data-level")).toBe("low");
    expect(screen.getByRole("group").textContent).toContain("Pouco saldo para um pedido grande");
    rerender(<OlenaCreditMeter usage={usage(480)} resetAt={later} spend={undefined} />);
    expect(screen.getByRole("group").getAttribute("data-level")).toBe("empty");
    expect(screen.getByRole("group").textContent).toContain("Os créditos de hoje acabaram");
  });

  it("ao gastar, anuncia o gasto e a contagem chega ao saldo novo", async () => {
    render(
      <OlenaCreditMeter
        usage={usage(52)}
        resetAt={later}
        spend={{ id: 1, amount: 42, from: 470, to: 428, instant: false }}
      />,
    );
    expect(screen.getByRole("status").textContent).toContain("Gastou 42 créditos.");
    await waitFor(() => expect(screen.getByRole("group").textContent).toContain("428"), {
      timeout: 2500,
    });
  });

  it("com movimento reduzido o número muda de uma vez", () => {
    render(
      <OlenaCreditMeter
        usage={usage(52)}
        resetAt={later}
        spend={{ id: 1, amount: 42, from: 470, to: 428, instant: true }}
      />,
    );
    expect(screen.getByRole("group").textContent).toContain("428");
  });
});

describe("leitura do saldo", () => {
  it("o gasto só aparece da segunda leitura em diante e toca o som", async () => {
    fetchUsage.mockResolvedValueOnce(usage(10)).mockResolvedValueOnce(usage(52));
    const { result } = renderHook(() => useOlenaCredits());
    await waitFor(() => expect(result.current.usage?.usedCredits).toBe(10));
    expect(result.current.spend).toBeUndefined();
    expect(playSpend).not.toHaveBeenCalled();
    await act(async () => {
      result.current.reload();
    });
    await waitFor(() => expect(result.current.spend?.amount).toBe(42), { timeout: 3000 });
    expect(result.current.spend).toMatchObject({ from: 470, to: 428, instant: false });
    expect(playSpend).toHaveBeenCalledWith(undefined, 42);
  });

  it("geração que falhou e foi devolvida não gasta nem faz barulho", async () => {
    fetchUsage.mockResolvedValue(usage(10));
    const { result } = renderHook(() => useOlenaCredits());
    await waitFor(() => expect(result.current.usage).toBeDefined());
    await act(async () => {
      result.current.reload();
    });
    await waitFor(() => expect(fetchUsage).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(result.current.spend).toBeUndefined();
    expect(playSpend).not.toHaveBeenCalled();
  });

  it("marca o gasto como instantâneo com movimento reduzido", async () => {
    reduced.mockReturnValue(true);
    fetchUsage.mockResolvedValueOnce(usage(10)).mockResolvedValueOnce(usage(30));
    const { result } = renderHook(() => useOlenaCredits());
    await waitFor(() => expect(result.current.usage).toBeDefined());
    await act(async () => {
      result.current.reload();
    });
    await waitFor(() => expect(result.current.spend?.instant).toBe(true), { timeout: 3000 });
  });

  it("sem conta conectada não pede o saldo", async () => {
    services.mockResolvedValue({ auth: { currentUser: { isAnonymous: true } } });
    const { result } = renderHook(() => useOlenaCredits());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchUsage).not.toHaveBeenCalled();
    expect(result.current.usage).toBeUndefined();
  });
});
