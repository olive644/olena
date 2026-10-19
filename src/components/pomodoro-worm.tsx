/**
 * Minhoca verde de papel recortado que serve de fundo ao relógio do Pomodoro. Cada gomo é um
 * polígono facetado com uma face clara em cima, empilhados da cauda (esquerda) para a cabeça.
 */
const WORM_WIDTH = 320;
const WORM_HEIGHT = 120;
const SIDES = 9;

interface Segment {
  x: number;
  y: number;
  r: number;
}

// o corpo ondula de leve e engorda da cauda até a cabeça
const BODY: Segment[] = [
  { x: 24, y: 70, r: 30 },
  { x: 62, y: 54, r: 38 },
  { x: 102, y: 70, r: 42 },
  { x: 142, y: 54, r: 44 },
  { x: 182, y: 70, r: 44 },
  { x: 222, y: 54, r: 44 },
  { x: 262, y: 64, r: 50 },
];

const point = (x: number, y: number, r: number, index: number, squash = 1) => {
  const angle = (Math.PI * 2 * index) / SIDES - Math.PI / 2;
  // raio levemente irregular: dá o corte de tesoura em vez de um círculo perfeito
  const jitter = 1 + (index % 3 === 0 ? 0.05 : index % 3 === 1 ? -0.04 : 0.01);
  return `${(x + Math.cos(angle) * r * jitter).toFixed(1)},${(y + Math.sin(angle) * r * jitter * squash).toFixed(1)}`;
};

const ring = (segment: Segment, dy = 0) =>
  Array.from({ length: SIDES }, (_, i) =>
    point(segment.x, segment.y + dy, segment.r, i, 0.92),
  ).join(" ");

const light = (segment: Segment) => {
  const { x, y, r } = segment;
  return [
    point(x, y, r * 0.86, 7, 0.92),
    point(x, y, r * 0.86, 8, 0.92),
    point(x, y, r * 0.86, 0, 0.92),
    point(x, y, r * 0.86, 1, 0.92),
    `${(x + r * 0.1).toFixed(1)},${(y - r * 0.05).toFixed(1)}`,
  ].join(" ");
};

const facet = (segment: Segment) => {
  const { x, y, r } = segment;
  return `${(x - r * 0.1).toFixed(1)},${(y - r * 0.8).toFixed(1)} ${(x + r * 0.45).toFixed(1)},${(y - r * 0.62).toFixed(1)} ${(x + r * 0.1).toFixed(1)},${(y - r * 0.3).toFixed(1)}`;
};

export function PomodoroWorm() {
  const head = BODY[BODY.length - 1]!;
  return (
    <svg
      className="pomodoro-worm"
      viewBox={`0 0 ${WORM_WIDTH} ${WORM_HEIGHT}`}
      aria-hidden="true"
      focusable="false"
    >
      {BODY.map((segment, index) => (
        <g key={index}>
          <polygon points={ring(segment, 5)} fill="#24603a" />
          <polygon points={ring(segment)} fill={index % 2 ? "#3f9d52" : "#4aa95a"} />
          <polygon points={light(segment)} fill={index % 2 ? "#63bd68" : "#72c873"} />
          <polygon points={facet(segment)} fill="#9be28d" />
        </g>
      ))}
      <g>
        <ellipse cx={head.x + 6} cy={head.y - 12} rx="13" ry="14" fill="#fffaf0" />
        <ellipse cx={head.x + 26} cy={head.y - 4} rx="11" ry="12" fill="#fffaf0" />
        <circle cx={head.x + 9} cy={head.y - 10} r="6" fill="#242033" />
        <circle cx={head.x + 28} cy={head.y - 2} r="5" fill="#242033" />
        <circle cx={head.x + 11} cy={head.y - 12} r="2" fill="#fffaf0" />
        <circle cx={head.x + 30} cy={head.y - 4} r="1.8" fill="#fffaf0" />
        <polygon
          points={`${head.x + 6},${head.y + 18} ${head.x + 20},${head.y + 22} ${head.x + 32},${head.y + 14} ${head.x + 20},${head.y + 28}`}
          fill="#24603a"
        />
      </g>
    </svg>
  );
}
