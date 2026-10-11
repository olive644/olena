import { type ChartItem } from "../domain/agenda-dashboard";
import { PaperDigits } from "./paper-digits";
import { useId, useState } from "react";

const colors = ["#facc15", "#38a4ad", "#e55670", "#7c3aed", "#e8a43b"];
const depths = ["#b58b15", "#256b74", "#a73750", "#51259b", "#a56b25"];
const fullRing =
  "M60 10 A50 50 0 1 1 60 110 A50 50 0 1 1 60 10 M60 26 A34 34 0 1 0 60 94 A34 34 0 1 0 60 26 Z";
function ringSegment(start: number, end: number) {
  const gap = Math.min(0.035, (end - start) / 5);
  const from = start + gap;
  const to = end - gap;
  const point = (radius: number, angle: number) =>
    `${60 + radius * Math.cos(angle)} ${60 + radius * Math.sin(angle)}`;
  const large = to - from > Math.PI ? 1 : 0;
  return `M${point(50, from)} A50 50 0 ${large} 1 ${point(50, to)} L${point(34, to)} A34 34 0 ${large} 0 ${point(34, from)} Z`;
}
export function AgendaCharts({
  bars: suppliedBars,
  pie,
  unit,
  barTitle,
  pieTitle,
}: {
  bars: ChartItem[];
  pie: ChartItem[];
  unit: string;
  barTitle: string;
  pieTitle: string;
}) {
  const inspectionId = useId();
  const bars = suppliedBars.filter((item) => Number.isFinite(item.value) && item.value > 0);
  const maximum = Math.max(1, ...bars.map((item) => item.value));
  const slices = pie.filter((item) => Number.isFinite(item.value) && item.value > 0);
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  const [inspection, setInspection] = useState<{ source: "bar" | "pie"; label: string } | null>(
    null,
  );
  const inspected = (inspection?.source === "bar" ? bars : slices).find(
    (item) => item.label === inspection?.label,
  );
  const inspectBar = (index: number) => {
    const item = bars[Math.max(0, Math.min(bars.length - 1, index))];
    if (item) setInspection({ source: "bar", label: item.label });
  };
  const barTotal = bars.reduce((sum, item) => sum + item.value, 0);
  if (!barTotal && !total) return null;
  return (
    <div className="agenda-charts">
      {barTotal > 0 && (
        <figure className="agenda-chart agenda-chart--bars">
          <figcaption>{barTitle}</figcaption>
          <div
            className="agenda-bars"
            role="button"
            tabIndex={0}
            aria-describedby={inspectionId}
            aria-label={`${barTitle}: ${bars.map((item) => `${item.label}: ${item.value} ${unit}`).join(", ")}`}
            onFocus={() => inspectBar(0)}
            onPointerMove={(event) => {
              if (event.pointerType !== "mouse") return;
              const box = event.currentTarget.getBoundingClientRect();
              inspectBar(Math.floor(((event.clientX - box.left) / box.width) * bars.length));
            }}
            onClick={(event) => {
              if (!event.detail) return;
              const box = event.currentTarget.getBoundingClientRect();
              inspectBar(Math.floor(((event.clientX - box.left) / box.width) * bars.length));
            }}
            onKeyDown={(event) => {
              const current = bars.findIndex((item) => item.label === inspection?.label);
              if (["ArrowLeft", "ArrowRight", "Home", "End", "Enter", " "].includes(event.key)) {
                event.preventDefault();
                inspectBar(
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? bars.length - 1
                      : event.key === "ArrowLeft"
                        ? current - 1
                        : event.key === "ArrowRight"
                          ? current + 1
                          : Math.max(0, current),
                );
              }
            }}
          >
            {bars.map((item) => (
              <div
                className={`agenda-bar-column${inspection?.source === "bar" && inspection.label === item.label ? " is-inspected" : ""}`}
                key={item.label}
                aria-hidden="true"
              >
                <strong>
                  <PaperDigits value={String(item.value)} />
                </strong>
                <div className="agenda-bar-track">
                  <span style={{ height: `${(item.value / maximum) * 80}px` }} />
                </div>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
          {!bars.some((item) => item.value > 0) && (
            <small className="agenda-chart-empty">Nenhum registro neste período.</small>
          )}
        </figure>
      )}
      {total > 0 && (
        <figure className="agenda-chart agenda-chart--pie">
          <figcaption>{pieTitle}</figcaption>
          <div className="agenda-pie-content">
            <div className="agenda-donut">
              <svg
                className="agenda-pie"
                viewBox="0 0 120 128"
                role={total ? "group" : "img"}
                aria-label={
                  total
                    ? `${pieTitle}: ${slices.map((item) => `${item.label}: ${item.value} ${unit}`).join(", ")}`
                    : "Sem dados para distribuição"
                }
              >
                {!total && <path d={fullRing} fill="var(--agenda-fold)" fillRule="evenodd" />}
                {slices.map((item, index) => {
                  const start =
                    -Math.PI / 2 +
                    (slices.slice(0, index).reduce((sum, slice) => sum + slice.value, 0) / total) *
                      Math.PI *
                      2;
                  const angle = start + (item.value / total) * Math.PI * 2;
                  const interaction = {
                    role: "button" as const,
                    tabIndex: 0,
                    "aria-label": `${item.label}: ${item.value} ${unit}, ${Math.round((item.value / total) * 100)}%`,
                    "aria-describedby": inspectionId,
                    className:
                      inspection?.source === "pie" && inspection.label === item.label
                        ? "agenda-pie-slice is-inspected"
                        : "agenda-pie-slice",
                    onClick: () => setInspection({ source: "pie" as const, label: item.label }),
                    onMouseEnter: () =>
                      setInspection({ source: "pie" as const, label: item.label }),
                    onFocus: () => setInspection({ source: "pie" as const, label: item.label }),
                    onKeyDown: (event: React.KeyboardEvent<SVGElement>) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setInspection({ source: "pie", label: item.label });
                      }
                    },
                  };
                  const shape = slices.length === 1 ? fullRing : ringSegment(start, angle);
                  return (
                    <g key={item.label}>
                      <path
                        d={shape}
                        fill={depths[index]}
                        fillRule="evenodd"
                        transform="translate(0 5)"
                        aria-hidden="true"
                        pointerEvents="none"
                      />
                      <path
                        {...interaction}
                        d={shape}
                        fill={colors[index]}
                        fillRule="evenodd"
                        stroke="var(--agenda-paper)"
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}
              </svg>
              <div className="agenda-donut-total" aria-hidden="true">
                <strong>
                  <PaperDigits value={String(total)} />
                </strong>
                <small>{unit}</small>
              </div>
            </div>
            {total ? (
              <ul className="agenda-chart-legend">
                {slices.map((item, index) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      className="agenda-legend-inspect"
                      aria-label={`Inspecionar ${item.label}`}
                      onClick={() => setInspection({ source: "pie", label: item.label })}
                      onFocus={() => setInspection({ source: "pie", label: item.label })}
                    >
                      <i style={{ background: colors[index] }} aria-hidden="true" />
                      <span>{item.label}</span>
                      <strong>
                        <PaperDigits value={String(item.value)} /> <small>{unit}</small>
                      </strong>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="agenda-chart-empty">Sem dados para distribuir.</span>
            )}
          </div>
          {slices.length === 1 && (
            <small className="agenda-chart-empty">Um grupo registrado: 100% do total.</small>
          )}
        </figure>
      )}
      <output id={inspectionId} className="agenda-chart-inspection" aria-live="polite">
        {inspected ? (
          <>
            <strong>{inspected.label}</strong>
            <span>
              {inspected.value} {unit} ·{" "}
              {Math.round(
                (inspected.value / ((inspection?.source === "bar" ? barTotal : total) || 1)) * 100,
              )}
              % do total
            </span>
          </>
        ) : (
          <small>
            Toque nas barras ou fatias para inspecionar. Nas barras, use também as setas do teclado.
          </small>
        )}
      </output>
    </div>
  );
}
