import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AgendaCharts } from "./agenda-charts";
afterEach(cleanup);
it("inspects bars by keyboard and pie slices by click with exact values", () => {
  render(
    <AgendaCharts
      bars={[
        { label: "Dia vazio", value: 0 },
        { label: "1/10", value: 10 },
        { label: "2/10", value: 30 },
      ]}
      pie={[
        { label: "Matemática", value: 10 },
        { label: "Inglês", value: 30 },
      ]}
      unit="min"
      barTitle="Minutos por período"
      pieTitle="Por matéria"
    />,
  );
  const bars = screen.getByRole("button", { name: /^Minutos por período:/ });
  expect(screen.queryByText("Dia vazio")).toBeNull();
  fireEvent.focus(bars);
  expect(screen.getByRole("status").textContent).toBe("1/1010 min · 25% do total");
  fireEvent.keyDown(bars, { key: "ArrowRight" });
  expect(screen.getByRole("status").textContent).toBe("2/1030 min · 75% do total");
  const slice = screen.getByRole("button", { name: "Matemática: 10 min, 25%" });
  fireEvent.click(slice);
  expect(screen.getByRole("status").textContent).toBe("Matemática10 min · 25% do total");
  expect(slice.getAttribute("fill")).toBe("#facc15");
  expect(slice.tagName.toLowerCase()).toBe("path");
  expect(slice.getAttribute("d")).toContain("A34 34");
  expect(document.querySelector(".agenda-donut-total")?.textContent).toBe("40min");
  expect(screen.getByRole("button", { name: "Inglês: 30 min, 75%" }).getAttribute("fill")).toBe(
    "#38a4ad",
  );
  const heights = [...document.querySelectorAll<HTMLElement>(".agenda-bar-track > span")].map(
    (bar) => Number.parseFloat(bar.style.height),
  );
  expect(heights[0]! / heights[1]!).toBeCloseTo(1 / 3);
  fireEvent.keyDown(screen.getByRole("button", { name: "Inglês: 30 min, 75%" }), { key: "Enter" });
  expect(screen.getByRole("status").textContent).toContain("75% do total");
});
it("keeps an empty or single-group donut honest", () => {
  const props = { bars: [], unit: "min", barTitle: "Tempo", pieTitle: "Matérias" };
  const { rerender } = render(<AgendaCharts {...props} pie={[]} />);
  expect(document.querySelector(".agenda-charts")).toBeNull();
  expect(document.querySelectorAll(".agenda-pie-slice")).toHaveLength(0);
  rerender(<AgendaCharts {...props} pie={[{ label: "Inglês", value: 12 }]} />);
  const ring = screen.getByRole("button", { name: "Inglês: 12 min, 100%" });
  expect(ring.getAttribute("fill-rule")).toBe("evenodd");
  expect(ring.getAttribute("d")).toContain("A34 34");
  expect(document.querySelector(".agenda-donut-total")?.textContent).toBe("12min");
});
