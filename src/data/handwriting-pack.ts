import type { HandwritingPoint } from "../domain/handwriting";

// Formato compacto dos traços no armazenamento: em vez de um objeto por ponto
// ({"x":123.45,"y":678.91,"pressure":0.52}, 40 caracteres) os pontos de um traço vão em uma lista
// plana, três números por ponto (x, y, pressão), cerca de 17 caracteres por ponto. Uma folha ocupa
// menos da metade do espaço do navegador e o mesmo vale para o que sincroniza com a conta.
//
// Só a gravação muda. Na memória, na colaboração e em todo o resto os traços continuam com
// `points`, e a leitura entende os dois formatos, então dados antigos abrem normalmente.
//
// Implantação em duas etapas, para uma aba ou um aparelho com a versão anterior aberta não ler um
// espaço que não entende (e abrir um espaço vazio por cima do da nuvem): primeiro esta versão
// passa a LER o formato compacto e continua GRAVANDO o antigo; depois de os clientes terem
// atualizado, a etapa seguinte liga a gravação compacta em `PACKED_STORAGE_WRITES`.
export const PACKED_STORAGE_WRITES = false;

const PRESSURE_DECIMALS = 3;
const POSITION_DECIMALS = 2;

type PackedStroke = Record<string, unknown> & { pts: number[]; tilt?: number[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function packPoints(points: readonly HandwritingPoint[]): {
  pts: number[];
  tilt?: number[];
} {
  const pts: number[] = [];
  const hasTilt = points.some((point) => point.tiltX !== undefined || point.tiltY !== undefined);
  const tilt: number[] = [];
  for (const point of points) {
    pts.push(
      round(point.x, POSITION_DECIMALS),
      round(point.y, POSITION_DECIMALS),
      round(point.pressure, PRESSURE_DECIMALS),
    );
    if (hasTilt) tilt.push(Math.round(point.tiltX ?? 0), Math.round(point.tiltY ?? 0));
  }
  return hasTilt ? { pts, tilt } : { pts };
}

export function unpackPoints(pts: readonly number[], tilt?: readonly number[]): HandwritingPoint[] {
  const points: HandwritingPoint[] = [];
  for (let index = 0; index + 2 < pts.length; index += 3) {
    const tiltX = tilt?.[(index / 3) * 2];
    const tiltY = tilt?.[(index / 3) * 2 + 1];
    points.push({
      x: pts[index]!,
      y: pts[index + 1]!,
      pressure: pts[index + 2]!,
      // Sem inclinação no original, o campo nem existia: 0 e ausente são o mesmo para o desenho.
      ...(tiltX ? { tiltX } : {}),
      ...(tiltY ? { tiltY } : {}),
    });
  }
  return points;
}

function isNumberList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function packStroke(stroke: unknown): unknown {
  if (!isRecord(stroke) || !Array.isArray(stroke["points"])) return stroke;
  const { points, ...rest } = stroke as Record<string, unknown> & { points: HandwritingPoint[] };
  return { ...rest, ...packPoints(points) } satisfies PackedStroke;
}

function unpackStroke(stroke: unknown): unknown {
  if (!isRecord(stroke) || !isNumberList(stroke["pts"])) return stroke;
  const { pts, tilt, ...rest } = stroke;
  return { ...rest, points: unpackPoints(pts, isNumberList(tilt) ? tilt : undefined) };
}

function mapDocument(document: unknown, mapStroke: (stroke: unknown) => unknown): unknown {
  if (!isRecord(document) || !Array.isArray(document["strokes"])) return document;
  return { ...document, strokes: document["strokes"].map(mapStroke) };
}

// Aplica a troca em todas as folhas manuscritas de um espaço de estudos (anexos das folhas).
function mapWorkspace(workspace: unknown, mapStroke: (stroke: unknown) => unknown): unknown {
  if (!isRecord(workspace) || !Array.isArray(workspace["notes"])) return workspace;
  return {
    ...workspace,
    notes: workspace["notes"].map((note) => {
      if (!isRecord(note) || !Array.isArray(note["assets"])) return note;
      return {
        ...note,
        assets: note["assets"].map((asset) =>
          isRecord(asset) && asset["handwriting"] !== undefined
            ? { ...asset, handwriting: mapDocument(asset["handwriting"], mapStroke) }
            : asset,
        ),
      };
    }),
  };
}

export function packWorkspace<T>(workspace: T): unknown {
  return mapWorkspace(workspace, packStroke);
}

export function unpackWorkspace(workspace: unknown): unknown {
  return mapWorkspace(workspace, unpackStroke);
}

export function packDocument<T>(document: T): unknown {
  return mapDocument(document, packStroke);
}

export function unpackDocument(document: unknown): unknown {
  return mapDocument(document, unpackStroke);
}
