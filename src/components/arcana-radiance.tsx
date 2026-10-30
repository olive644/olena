import type { CSSProperties, ReactNode } from "react";
import type { OliverArtworkId } from "../data/oliver-tarot";
import { oliverRarity } from "../data/oliver-rarity";
import "./arcana-radiance.css";

const positions = [
  [-3, 12],
  [103, 25],
  [17, -2],
  [83, 102],
  [-4, 73],
  [104, 84],
  [64, -2],
  [26, 102],
  [-5, 43],
  [105, 54],
  [43, -3],
  [60, 103],
];
export function ArcanaRadiance({ id, children }: { id: OliverArtworkId; children: ReactNode }) {
  return <PaperRadiance rank={oliverRarity(id)}>{children}</PaperRadiance>;
}
export function PaperRadiance({ rank, children }: { rank: 0 | 1 | 2 | 3; children: ReactNode }) {
  return (
    <div className="arcana-radiance" data-rarity={rank}>
      {children}
      <span className="arcana-radiance__glints" aria-hidden="true">
        {positions.slice(0, [4, 6, 8, 12][rank]).map(([x, y], index) => (
          <i
            key={index}
            style={{ left: `${x}%`, top: `${y}%`, "--glint": index } as CSSProperties}
          />
        ))}
      </span>
    </div>
  );
}
