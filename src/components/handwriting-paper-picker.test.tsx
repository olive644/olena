import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HandwritingPaperPicker, PAPER_HOLD_MS } from "./handwriting-paper-picker";

it("mantém os nomes acessíveis sem rótulos que expandem os botões", () => {
  const props = {
    paper: "ruled" as const,
    paperColor: "aged" as const,
    onToggleSection: vi.fn(),
    onSelectPaper: vi.fn(),
    onSelectPaperColor: vi.fn(),
  };
  const { rerender } = render(
    <HandwritingPaperPicker {...props} sectionsOpen={{ paper: true, color: false }} />,
  );
  expect(screen.getByRole("button", { name: "Tipo de papel" }).title).toBe("Tipo de papel");
  expect(screen.getByRole("button", { name: "Cor da folha" }).title).toBe("Cor da folha");
  expect(screen.getByRole("button", { name: "Pautado" }).title).toBe("Pautado");
  expect(screen.getByRole("button", { name: "Cornell" }).title).toBe("Cornell");
  expect(screen.queryByRole("button", { name: "Pauta musical" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Plano semanal" })).toBeNull();
  expect(screen.queryByRole("button", { name: /pontilhado/i })).toBeNull();
  expect(screen.getAllByRole("button")).toHaveLength(9);
  rerender(<HandwritingPaperPicker {...props} sectionsOpen={{ paper: false, color: true }} />);
  expect(screen.getByRole("button", { name: "Papel de livro" }).title).toBe("Papel de livro");
});

afterEach(() => vi.useRealTimers());

function holdSetup(open: { paper: boolean; color: boolean } = { paper: true, color: false }) {
  vi.useFakeTimers();
  const props = {
    paper: "ruled" as const,
    paperColor: "aged" as const,
    onToggleSection: vi.fn(),
    onSelectPaper: vi.fn(),
    onSelectPaperColor: vi.fn(),
    onApplyToNotebook: vi.fn().mockResolvedValue(4),
  };
  render(<HandwritingPaperPicker {...props} sectionsOpen={open} />);
  return props;
}
const press = (name: string) =>
  fireEvent.pointerDown(screen.getByRole("button", { name }), {
    button: 0,
    isPrimary: true,
    pointerId: 1,
  });

it("segurar um tipo de folha troca o caderno inteiro e não escolhe de novo ao soltar", async () => {
  const props = holdSetup();
  const grid = screen.getByRole("button", { name: "Quadriculado" });
  expect(grid.title).toContain("Segure para trocar o caderno inteiro");
  press("Quadriculado");
  expect(grid.className).toContain("is-holding");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PAPER_HOLD_MS + 10);
  });
  expect(props.onApplyToNotebook).toHaveBeenCalledWith({ paper: "grid" });
  expect(grid.className).toContain("is-applied");
  fireEvent.pointerUp(grid);
  fireEvent.click(grid);
  expect(props.onSelectPaper).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toBe("Folhas trocadas: 4.");
});

it("soltar antes do tempo é um toque comum: troca só a folha aberta", async () => {
  const props = holdSetup();
  press("Quadriculado");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PAPER_HOLD_MS - 200);
  });
  fireEvent.pointerUp(screen.getByRole("button", { name: "Quadriculado" }));
  fireEvent.click(screen.getByRole("button", { name: "Quadriculado" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PAPER_HOLD_MS);
  });
  expect(props.onApplyToNotebook).not.toHaveBeenCalled();
  expect(props.onSelectPaper).toHaveBeenCalledWith("grid");
});

it("segurar uma cor de folha troca a cor do caderno inteiro", async () => {
  const props = holdSetup({ paper: false, color: true });
  press("Escura");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PAPER_HOLD_MS + 10);
  });
  expect(props.onApplyToNotebook).toHaveBeenCalledWith({ paperColor: "night" });
});

it("o botão Caderno inteiro faz o mesmo por teclado e toque, sem precisar segurar", async () => {
  const props = holdSetup();
  fireEvent.click(screen.getByRole("button", { name: "Aplicar ao caderno inteiro" }));
  await act(async () => {
    await Promise.resolve();
  });
  expect(props.onApplyToNotebook).toHaveBeenCalledWith({ paper: "ruled" });
});

it("sem a opção de caderno inteiro, segurar não faz nada de especial", async () => {
  vi.useFakeTimers();
  const onSelectPaper = vi.fn();
  render(
    <HandwritingPaperPicker
      paper="ruled"
      paperColor="aged"
      sectionsOpen={{ paper: true, color: false }}
      onToggleSection={vi.fn()}
      onSelectPaper={onSelectPaper}
      onSelectPaperColor={vi.fn()}
    />,
  );
  expect(screen.queryByRole("button", { name: "Aplicar ao caderno inteiro" })).toBeNull();
  press("Quadriculado");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PAPER_HOLD_MS + 10);
  });
  fireEvent.click(screen.getByRole("button", { name: "Quadriculado" }));
  expect(onSelectPaper).toHaveBeenCalledWith("grid");
});
