import { uiText, useLanguage } from "../i18n/runtime";
import { formatCoordinateNumber, type CoordinateStats } from "../domain/coordinate-math";
import type {
  HandwritingLayerKey,
  HandwritingLayerVisibility,
  HandwritingStroke,
} from "../domain/handwriting";
import type { RulerKind, RulerUnit } from "../domain/ruler";

type Brush = NonNullable<HandwritingStroke["brush"]>;
type CoordinateStep = 1 | 2 | 5 | 10;

type HandwritingBrushPanelProps = {
  brush: Brush;
  color: string;
  onBrushChange: (brush: Brush) => void;
};

export function HandwritingBrushPanel({ brush, color, onBrushChange }: HandwritingBrushPanelProps) {
  useLanguage();

  return (
    <aside className="handwriting-brush-panel" aria-label={uiText(233)}>
      <header>
        <div>
          <small>{uiText(234)}</small>
        </div>
      </header>
      {(
        [
          ["fine", uiText(1667), 2],
          ["ink", uiText(1668), 7],
          ["soft", uiText(1669), 14],
        ] as const
      ).map(([value, title, size]) => (
        <button
          type="button"
          key={value}
          aria-pressed={brush === value}
          onClick={() => onBrushChange(value)}
        >
          <span className="brush-card-title">{title}</span>
          <img className="brush-instrument" src={`/brushes/${value}.svg`} alt="" />
          <svg className="brush-sample" viewBox="0 0 180 46" aria-hidden="true">
            <path
              d="M10 31C36 32 39 9 66 19S104 39 130 24 158 15 170 19"
              fill="none"
              stroke={color}
              strokeWidth={size}
              strokeLinecap="round"
              opacity={value === "soft" ? 0.3 : 1}
            />
          </svg>
        </button>
      ))}
    </aside>
  );
}

type HandwritingRulerPanelProps = {
  rulerUnit: RulerUnit;
  rulerKind: RulerKind;
  onRulerUnitChange: (unit: RulerUnit) => void;
  onRulerKindChange: (kind: RulerKind) => void;
};

export function HandwritingRulerPanel({
  rulerUnit,
  rulerKind,
  onRulerUnitChange,
  onRulerKindChange,
}: HandwritingRulerPanelProps) {
  useLanguage();

  const rulers = [
    ["straight", uiText(235), uiText(1670), "straight"],
    ["triangle-45", uiText(1671), uiText(236), "triangle-45"],
    ["triangle-30", uiText(1672), uiText(237), "triangle-30"],
    ["protractor", uiText(1673), uiText(238), "protractor"],
    ["circle", uiText(1674), uiText(239), "circle"],
    ["curve", uiText(1675), uiText(240), "curve"],
  ] as const;
  return (
    <aside className="handwriting-brush-panel handwriting-ruler-panel" aria-label={uiText(241)}>
      <header>
        <div>
          <small>{uiText(242)}</small>
        </div>
      </header>
      <fieldset className="ruler-unit-picker" aria-label={uiText(243)}>
        <legend>{uiText(244)}</legend>
        {(["cm", "in", "px"] as const).map((unit) => (
          <button
            type="button"
            key={unit}
            aria-label={unit === "cm" ? uiText(245) : unit === "in" ? uiText(1676) : uiText(1677)}
            aria-pressed={rulerUnit === unit}
            onClick={() => onRulerUnitChange(unit)}
          >
            <span>{unit}</span>
            <i aria-hidden="true" />
          </button>
        ))}
      </fieldset>
      <div className="ruler-case" role="group" aria-label={uiText(246)}>
        {rulers.map(([kind, title, description, drawing]) => (
          <button
            type="button"
            key={kind}
            aria-pressed={rulerKind === kind}
            onClick={() => onRulerKindChange(kind)}
          >
            <span className="ruler-card-art" data-ruler={drawing} aria-hidden="true">
              <i />
            </span>
            <strong>{title}</strong>
            <small>{description}</small>
          </button>
        ))}
      </div>
      <p>{uiText(247)}</p>
    </aside>
  );
}

type HandwritingCoordinatePanelProps = {
  coordinateStep: CoordinateStep;
  onStepChange: (step: CoordinateStep) => void;
  coordinateMeasurements: boolean;
  onMeasurementsChange: (enabled: boolean) => void;
  equalCoordinateAxes: boolean;
  onEqualAxesChange: (enabled: boolean) => void;
  inspectedCoordinateStats: CoordinateStats | null;
  isLivePreview: boolean;
};

export function HandwritingCoordinatePanel({
  coordinateStep,
  onStepChange,
  inspectedCoordinateStats,
  isLivePreview,
}: HandwritingCoordinatePanelProps) {
  useLanguage();

  return (
    <aside className="handwriting-brush-panel" aria-label={uiText(248)}>
      <header>
        <div>
          <small>{uiText(249)}</small>
          <h3>{uiText(250)}</h3>
        </div>
      </header>
      {([1, 2, 5, 10] as const).map((step) => (
        <button
          type="button"
          key={step}
          aria-pressed={coordinateStep === step}
          onClick={() => onStepChange(step)}
        >
          <span className="brush-card-title">
            {uiText(251)} {step}
          </span>
          <svg viewBox="0 0 180 44" aria-hidden="true">
            <path
              d="M18 36V8M18 36H166M18 12l-5 8m5-8 5 8m139 16-8-5m8 5-8 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M66 31v10M114 31v10M13 24h10" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      ))}
      {inspectedCoordinateStats && (
        <section className="handwriting-coordinate-inspector" aria-live="polite">
          <small>{isLivePreview ? uiText(252) : uiText(1678)}</small>
          <strong>
            {uiText(253)} {formatCoordinateNumber(inspectedCoordinateStats.deltaX)} {uiText(254)}{" "}
            {formatCoordinateNumber(inspectedCoordinateStats.deltaY)}
          </strong>
          <dl>
            <div>
              <dt>{uiText(255)}</dt>
              <dd>{formatCoordinateNumber(inspectedCoordinateStats.distance)}</dd>
            </div>
            <div>
              <dt>{uiText(256)}</dt>
              <dd>
                {inspectedCoordinateStats.slope === null
                  ? "vertical"
                  : formatCoordinateNumber(inspectedCoordinateStats.slope)}
              </dd>
            </div>
            <div>
              <dt>{uiText(257)}</dt>
              <dd>{formatCoordinateNumber(inspectedCoordinateStats.angle)}°</dd>
            </div>
          </dl>
          {isLivePreview ? <p>{uiText(258)}</p> : <p>{uiText(259)}</p>}
        </section>
      )}
    </aside>
  );
}

type HandwritingLayerPanelProps = {
  hasBackgroundLayer: boolean;
  layerVisibility: HandwritingLayerVisibility;
  visibleLayerOrder: readonly HandwritingLayerKey[];
  onToggleLayer: (layer: keyof HandwritingLayerVisibility) => void;
  onMoveLayer: (layer: HandwritingLayerKey, direction: -1 | 1) => void;
};

export function HandwritingLayerPanel({
  hasBackgroundLayer,
  layerVisibility,
  visibleLayerOrder,
  onToggleLayer,
  onMoveLayer,
}: HandwritingLayerPanelProps) {
  useLanguage();

  return (
    <aside className="handwriting-brush-panel handwriting-layer-panel" aria-label={uiText(260)}>
      <header>
        <div>
          <small>{uiText(261)}</small>
          <h3>{uiText(260)}</h3>
        </div>
      </header>
      {hasBackgroundLayer && (
        <label className="handwriting-layer-row">
          <input
            type="checkbox"
            checked={layerVisibility.background}
            onChange={() => onToggleLayer("background")}
          />
          <span>
            <strong>{uiText(262)}</strong>
            <small>{uiText(263)}</small>
          </span>
        </label>
      )}
      {visibleLayerOrder.map((layer, index) => {
        const labels: Record<HandwritingLayerKey, [string, string]> = {
          coordinates: [uiText(352), uiText(264)],
          text: [uiText(361), uiText(1679)],
          strokes: [uiText(265), uiText(1680)],
          stickies: ["Post-its", uiText(1681)],
        };
        const [title, description] = labels[layer];
        return (
          <div className="handwriting-layer-row" key={layer}>
            <input
              type="checkbox"
              checked={layerVisibility[layer]}
              onChange={() => onToggleLayer(layer)}
              aria-label={uiText(1682, [title])}
            />
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
              <span className="handwriting-layer-reorder">
                <button
                  type="button"
                  aria-label={uiText(1683, [title])}
                  disabled={index === 0}
                  onClick={() => onMoveLayer(layer, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={uiText(1684, [title])}
                  disabled={index === visibleLayerOrder.length - 1}
                  onClick={() => onMoveLayer(layer, 1)}
                >
                  ↓
                </button>
              </span>
            </span>
          </div>
        );
      })}
      {!hasBackgroundLayer && visibleLayerOrder.length === 0 && (
        <p className="handwriting-layer-empty">{uiText(266)}</p>
      )}
    </aside>
  );
}
