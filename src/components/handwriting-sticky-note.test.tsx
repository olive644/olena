import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HandwritingSticky } from "../domain/handwriting";
import { reviewPortugueseText } from "../domain/text-review";
import { HandwritingStickyNote } from "./handwriting-sticky-note";

function sticky(overrides: Partial<HandwritingSticky> = {}): HandwritingSticky {
  return { id: "s1", x: 100, y: 200, color: "yellow", text: "olá", ...overrides };
}

function noteProps(overrides: Partial<Parameters<typeof HandwritingStickyNote>[0]> = {}) {
  return {
    sticky: sticky(),
    isSelected: false,
    ignorePointer: false,
    menuOpen: false,
    colorMenuOpen: false,
    textAutoCorrect: true,
    onRemember: vi.fn(),
    onUpdate: vi.fn(),
    onDragStart: vi.fn(),
    onDragMove: vi.fn(),
    onDragEnd: vi.fn(),
    onResizeStart: vi.fn(),
    onResizeMove: vi.fn(),
    onResizeEnd: vi.fn(),
    onToggleMenu: vi.fn(),
    onToggleColorMenu: vi.fn(),
    onMoveMode: vi.fn(),
    onToggleChecklist: vi.fn(),
    onChangeColor: vi.fn(),
    onLayer: vi.fn(),
    onRemove: vi.fn(),
    onUpdateChecklistItem: vi.fn(),
    onRemoveChecklistItem: vi.fn(),
    onAddChecklistItem: vi.fn(),
    ...overrides,
  };
}

describe("post-it: aparência", () => {
  it("nomeia o tipo de cada anotação", () => {
    const { rerender } = render(<HandwritingStickyNote {...noteProps()} />);
    expect(screen.getByText("Nota")).toBeTruthy();
    rerender(<HandwritingStickyNote {...noteProps({ sticky: sticky({ kind: "text" }) })} />);
    expect(screen.getByText("Texto")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mover texto" })).toBeTruthy();
    rerender(
      <HandwritingStickyNote
        {...noteProps({
          sticky: sticky({ checklist: [{ id: "i1", text: "Ler", done: false }] }),
        })}
      />,
    );
    expect(screen.getByText("Checklist")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mover post-it" })).toBeTruthy();
  });

  it("aplica classes de cor, fórmula e seleção e posiciona em porcentagem da folha", () => {
    const { container } = render(
      <HandwritingStickyNote
        {...noteProps({
          sticky: sticky({ color: "blue", formula: true, x: 600, y: 800 }),
          isSelected: true,
        })}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("handwriting-sticky--blue");
    expect(root.className).toContain("handwriting-sticky--formula");
    expect(root.className).toContain("is-selected");
    expect(root.style.left).toBe("50%");
    expect(root.style.top).toBe("50%");
  });

  it("deixa o ponteiro passar quando pedido", () => {
    const { container } = render(<HandwritingStickyNote {...noteProps({ ignorePointer: true })} />);
    expect((container.firstElementChild as HTMLElement).style.pointerEvents).toBe("none");
  });
});

describe("post-it: mover e redimensionar", () => {
  it("move com as setas do teclado, guardando o histórico antes", () => {
    const props = noteProps();
    render(<HandwritingStickyNote {...props} />);
    const handle = screen.getByRole("button", { name: "Mover post-it" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(props.onRemember).toHaveBeenCalledTimes(2);
    expect(props.onUpdate).toHaveBeenNthCalledWith(1, { x: 110, y: 200 });
    expect(props.onUpdate).toHaveBeenNthCalledWith(2, { x: 100, y: 190 });
  });

  it("não sai da folha ao mover com o teclado", () => {
    const props = noteProps({ sticky: sticky({ x: 0, y: 0 }) });
    render(<HandwritingStickyNote {...props} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Mover post-it" }), { key: "ArrowLeft" });
    expect(props.onUpdate).toHaveBeenCalledWith({ x: 0, y: 0 });
  });

  it("ignora teclas que não movem", () => {
    const props = noteProps();
    render(<HandwritingStickyNote {...props} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Mover post-it" }), { key: "a" });
    expect(props.onUpdate).not.toHaveBeenCalled();
    expect(props.onRemember).not.toHaveBeenCalled();
  });

  it("repassa os gestos de arrastar e de redimensionar com o post-it", () => {
    const props = noteProps();
    render(<HandwritingStickyNote {...props} />);
    const handle = screen.getByRole("button", { name: "Mover post-it" });
    fireEvent.pointerDown(handle);
    fireEvent.pointerMove(handle);
    fireEvent.pointerUp(handle);
    fireEvent.pointerCancel(handle);
    expect(props.onDragStart).toHaveBeenCalledWith(expect.anything(), props.sticky);
    expect(props.onDragMove).toHaveBeenCalledWith(expect.anything(), props.sticky);
    expect(props.onDragEnd).toHaveBeenCalledTimes(2);
    const resize = screen.getByRole("button", { name: "Redimensionar post-it" });
    fireEvent.pointerDown(resize);
    fireEvent.pointerMove(resize);
    fireEvent.pointerUp(resize);
    fireEvent.pointerCancel(resize);
    expect(props.onResizeStart).toHaveBeenCalledWith(expect.anything(), props.sticky);
    expect(props.onResizeMove).toHaveBeenCalledWith(expect.anything(), props.sticky);
    expect(props.onResizeEnd).toHaveBeenCalledTimes(2);
  });
});

describe("post-it: menu", () => {
  it("abre e fecha pelo botão de opções", () => {
    const props = noteProps();
    const { rerender } = render(<HandwritingStickyNote {...props} />);
    const trigger = screen.getByRole("button", { name: "Opções do post-it" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger);
    expect(props.onToggleMenu).toHaveBeenCalledTimes(1);
    rerender(<HandwritingStickyNote {...props} menuOpen />);
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Opções do post-it" }).getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("oferece todas as ações a uma nota e dispara cada uma", () => {
    const props = noteProps({ menuOpen: true });
    render(<HandwritingStickyNote {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Mover$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Checklist/ }));
    fireEvent.click(screen.getByRole("button", { name: /Cores/ }));
    fireEvent.click(screen.getByRole("button", { name: /Trazer para frente/ }));
    fireEvent.click(screen.getByRole("button", { name: /Enviar para trás/ }));
    fireEvent.click(screen.getByRole("button", { name: /Remover/ }));
    expect(props.onMoveMode).toHaveBeenCalledTimes(1);
    expect(props.onToggleChecklist).toHaveBeenCalledTimes(1);
    expect(props.onToggleColorMenu).toHaveBeenCalledTimes(1);
    expect(props.onLayer).toHaveBeenNthCalledWith(1, "front");
    expect(props.onLayer).toHaveBeenNthCalledWith(2, "back");
    expect(props.onRemove).toHaveBeenCalledTimes(1);
  });

  it("esconde checklist, cores e camadas em textos da folha", () => {
    render(
      <HandwritingStickyNote
        {...noteProps({ sticky: sticky({ kind: "text" }), menuOpen: true })}
      />,
    );
    expect(screen.queryByRole("button", { name: /Checklist/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Cores/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Trazer para frente/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Remover/ })).toBeTruthy();
  });

  it("troca o rótulo do checklist quando a nota já é um checklist", () => {
    render(
      <HandwritingStickyNote
        {...noteProps({
          menuOpen: true,
          sticky: sticky({ checklist: [{ id: "i1", text: "Ler", done: false }] }),
        })}
      />,
    );
    expect(screen.getByRole("button", { name: /Voltar para nota/ })).toBeTruthy();
  });

  it("mostra as três cores e escolhe uma", () => {
    const props = noteProps({ menuOpen: true, colorMenuOpen: true });
    render(<HandwritingStickyNote {...props} />);
    expect(screen.getByRole("button", { name: "Usar cor amarela" }).className).toBe("is-active");
    fireEvent.click(screen.getByRole("button", { name: "Usar cor azul" }));
    expect(props.onChangeColor).toHaveBeenCalledWith("blue");
    expect(screen.getByRole("button", { name: "Usar cor lilás" })).toBeTruthy();
  });
});

describe("post-it: texto e checklist", () => {
  it("edita o texto e guarda o histórico ao focar", () => {
    const props = noteProps();
    render(<HandwritingStickyNote {...props} />);
    const field = screen.getByLabelText("Texto do post-it");
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "nova ideia" } });
    expect(props.onRemember).toHaveBeenCalledTimes(1);
    expect(props.onUpdate).toHaveBeenCalledWith({ text: "nova ideia" });
  });

  it("corrige a acentuação ao sair do campo quando a correção está ligada", () => {
    const input = "voce nao sabe";
    const corrected = reviewPortugueseText(input);
    expect(corrected).not.toBe(input);
    const props = noteProps({ sticky: sticky({ text: input }) });
    render(<HandwritingStickyNote {...props} />);
    fireEvent.blur(screen.getByLabelText("Texto do post-it"));
    expect(props.onUpdate).toHaveBeenCalledWith({ text: corrected });
  });

  it("não corrige quando a correção está desligada", () => {
    const props = noteProps({ sticky: sticky({ text: "voce nao sabe" }), textAutoCorrect: false });
    render(<HandwritingStickyNote {...props} />);
    fireEvent.blur(screen.getByLabelText("Texto do post-it"));
    expect(props.onUpdate).not.toHaveBeenCalled();
  });

  it("usa o rótulo de texto da folha para textos soltos", () => {
    render(<HandwritingStickyNote {...noteProps({ sticky: sticky({ kind: "text" }) })} />);
    expect(screen.getByLabelText("Texto na folha")).toBeTruthy();
  });

  it("mostra o checklist, marca itens, edita, remove e acrescenta", () => {
    const props = noteProps({
      sticky: sticky({
        text: "Estudar",
        checklist: [
          { id: "i1", text: "Ler", done: false },
          { id: "i2", text: "Resumir", done: true },
        ],
      }),
    });
    render(<HandwritingStickyNote {...props} />);
    expect(screen.queryByLabelText("Texto do post-it")).toBeNull();
    fireEvent.change(screen.getByLabelText("Título do checklist"), { target: { value: "Prova" } });
    expect(props.onUpdate).toHaveBeenCalledWith({ text: "Prova" });
    fireEvent.click(screen.getByRole("button", { name: "Marcar como concluído" }));
    expect(props.onRemember).toHaveBeenCalledTimes(1);
    expect(props.onUpdateChecklistItem).toHaveBeenCalledWith("i1", { done: true });
    fireEvent.click(screen.getByRole("button", { name: "Marcar como pendente" }));
    expect(props.onUpdateChecklistItem).toHaveBeenCalledWith("i2", { done: false });
    const items = screen.getAllByLabelText("Item do checklist");
    fireEvent.change(items[0]!, { target: { value: "Ler tudo" } });
    expect(props.onUpdateChecklistItem).toHaveBeenCalledWith("i1", { text: "Ler tudo" });
    fireEvent.click(screen.getAllByRole("button", { name: "Remover item" })[1]!);
    expect(props.onRemoveChecklistItem).toHaveBeenCalledWith("i2");
    fireEvent.click(screen.getByRole("button", { name: "+ Item" }));
    expect(props.onAddChecklistItem).toHaveBeenCalledTimes(1);
  });
});
