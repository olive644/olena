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
  return (
    <aside className="handwriting-brush-panel" aria-label="Pincéis da caneta">
      <header>
        <div>
          <small>SEU ESTOJO</small>
        </div>
      </header>
      {(
        [
          ["fine", "Fineliner", 2],
          ["ink", "Caneta-tinteiro", 7],
          ["soft", "Pincel macio", 14],
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
  const rulers = [
    ["straight", "Régua reta", "Linhas livres", "straight"],
    ["triangle-45", "Esquadro 45°", "Ângulos de 45°", "triangle-45"],
    ["triangle-30", "Esquadro 30°/60°", "Ângulos de 30°", "triangle-30"],
    ["protractor", "Transferidor", "Ângulos de 15°", "protractor"],
    ["circle", "Gabarito circular", "Círculos precisos", "circle"],
    ["curve", "Curva francesa", "Curvas contínuas", "curve"],
  ] as const;
  return (
    <aside
      className="handwriting-brush-panel handwriting-ruler-panel"
      aria-label="Estojo de réguas"
    >
      <header>
        <div>
          <small>ESTOJO TÉCNICO</small>
        </div>
      </header>
      <fieldset className="ruler-unit-picker" aria-label="Unidades da régua">
        <legend>Unidade</legend>
        {(["cm", "in", "px"] as const).map((unit) => (
          <button
            type="button"
            key={unit}
            aria-label={unit === "cm" ? "Centímetros" : unit === "in" ? "Polegadas" : "Pixels"}
            aria-pressed={rulerUnit === unit}
            onClick={() => onRulerUnitChange(unit)}
          >
            <span>{unit}</span>
            <i aria-hidden="true" />
          </button>
        ))}
      </fieldset>
      <div className="ruler-case" role="group" aria-label="Tipos de régua">
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
      <p>96 px equivalem a 1 polegada. A escala acompanha a folha, mesmo com zoom.</p>
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
  coordinateMeasurements,
  onMeasurementsChange,
  equalCoordinateAxes,
  onEqualAxesChange,
  inspectedCoordinateStats,
  isLivePreview,
}: HandwritingCoordinatePanelProps) {
  return (
    <aside className="handwriting-brush-panel" aria-label="Opções do sistema de coordenadas">
      <header>
        <div>
          <small>MATEMÁTICA</small>
          <h3>Sistema de coordenadas</h3>
        </div>
      </header>
      <p>
        Arraste a partir da origem para criar os eixos. Cada divisão ocupa um quadrado da folha.
      </p>
      {([1, 2, 5, 10] as const).map((step) => (
        <button
          type="button"
          key={step}
          aria-pressed={coordinateStep === step}
          onClick={() => onStepChange(step)}
        >
          <span className="brush-card-title">Cada divisão vale {step}</span>
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
      <label className="handwriting-coordinate-toggle">
        <input
          type="checkbox"
          checked={coordinateMeasurements}
          onChange={(event) => onMeasurementsChange(event.target.checked)}
        />
        <span>Medições nos eixos</span>
      </label>
      <label className="handwriting-coordinate-toggle">
        <input
          type="checkbox"
          checked={equalCoordinateAxes}
          onChange={(event) => onEqualAxesChange(event.target.checked)}
        />
        <span>Eixos com o mesmo tamanho</span>
      </label>
      {inspectedCoordinateStats && (
        <section className="handwriting-coordinate-inspector" aria-live="polite">
          <small>{isLivePreview ? "PRÉVIA DO GESTO" : "LEITURA DO EIXO"}</small>
          <strong>
            Δx {formatCoordinateNumber(inspectedCoordinateStats.deltaX)} · Δy{" "}
            {formatCoordinateNumber(inspectedCoordinateStats.deltaY)}
          </strong>
          <dl>
            <div>
              <dt>Distância</dt>
              <dd>{formatCoordinateNumber(inspectedCoordinateStats.distance)}</dd>
            </div>
            <div>
              <dt>Inclinação</dt>
              <dd>
                {inspectedCoordinateStats.slope === null
                  ? "vertical"
                  : formatCoordinateNumber(inspectedCoordinateStats.slope)}
              </dd>
            </div>
            <div>
              <dt>Ângulo</dt>
              <dd>{formatCoordinateNumber(inspectedCoordinateStats.angle)}°</dd>
            </div>
          </dl>
          {isLivePreview ? (
            <p>Solte para salvar este sistema. A prévia acompanha o arraste.</p>
          ) : (
            <p>Use Selecionar para inspecionar outro sistema desenhado.</p>
          )}
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
  return (
    <aside
      className="handwriting-brush-panel handwriting-layer-panel"
      aria-label="Camadas da folha"
    >
      <header>
        <div>
          <small>ORGANIZAÇÃO</small>
          <h3>Camadas da folha</h3>
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
            <strong>Imagens</strong>
            <small>Documentos e fotos importados</small>
          </span>
        </label>
      )}
      {visibleLayerOrder.map((layer, index) => {
        const labels: Record<HandwritingLayerKey, [string, string]> = {
          coordinates: ["Coordenadas", "Eixos e medições"],
          text: ["Texto", "Texto digitado na folha"],
          strokes: ["Traços", "Caneta e marca-texto"],
          stickies: ["Post-its", "Notas e checklists"],
        };
        const [title, description] = labels[layer];
        return (
          <div className="handwriting-layer-row" key={layer}>
            <input
              type="checkbox"
              checked={layerVisibility[layer]}
              onChange={() => onToggleLayer(layer)}
              aria-label={`Mostrar camada ${title}`}
            />
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
              <span className="handwriting-layer-reorder">
                <button
                  type="button"
                  aria-label={`Mover ${title} para cima`}
                  disabled={index === 0}
                  onClick={() => onMoveLayer(layer, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Mover ${title} para baixo`}
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
        <p className="handwriting-layer-empty">Nenhuma camada adicionada ainda.</p>
      )}
    </aside>
  );
}
