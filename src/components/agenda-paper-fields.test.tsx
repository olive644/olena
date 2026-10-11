import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PaperDateField, PaperTimeField } from "./agenda-paper-fields";

it("revalidates the optional end date when the start date changes", () => {
  const { rerender } = render(
    <PaperDateField
      label="Repetir até"
      optional
      value="2026-10-15"
      min="2026-10-12"
      onChange={vi.fn()}
    />,
  );
  expect((screen.getByLabelText("Repetir até") as HTMLInputElement).checkValidity()).toBe(true);
  rerender(
    <PaperDateField
      label="Repetir até"
      optional
      value="2026-10-15"
      min="2026-10-16"
      onChange={vi.fn()}
    />,
  );
  expect((screen.getByLabelText("Repetir até") as HTMLInputElement).checkValidity()).toBe(false);
});

it("accepts valid manual dates and times, rejects impossible dates without changing saved values", () => {
  const date = vi.fn(),
    time = vi.fn();
  render(
    <>
      <PaperDateField label="Data" value="2026-10-12" onChange={date} />
      <PaperTimeField value="18:00" onChange={time} />
    </>,
  );
  const input = screen.getByLabelText("Data") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "31/02/2026" } });
  expect(input.checkValidity()).toBe(false);
  expect(date).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "13/10/2026" } });
  expect(date).toHaveBeenCalledWith("2026-10-13");
  expect(input.checkValidity()).toBe(true);
  fireEvent.change(screen.getByLabelText("Horário"), { target: { value: "25:00" } });
  expect(time).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Horário"), { target: { value: "09:15" } });
  expect(time).toHaveBeenCalledWith("09:15");
  fireEvent.change(screen.getByLabelText("Horário"), { target: { value: "1030" } });
  expect(time).toHaveBeenCalledWith("10:30");
  fireEvent.change(input, { target: { value: "14102026" } });
  expect(date).toHaveBeenCalledWith("2026-10-14");
});
