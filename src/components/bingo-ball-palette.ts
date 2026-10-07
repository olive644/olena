import type { CSSProperties } from "react";
const colors = ["#facc15", "#50bdc4", "#a779ef", "#ff8e77", "#fff0c7"];
const shades = ["#d4a600", "#147b83", "#51259b", "#c95649", "#d7b84b"];
const lights = ["#ffe88d", "#a4e8eb", "#d7baff", "#ffd3c5", "#fff9ef"];
export function paperBallStyle(number: string): CSSProperties {
  const group = Math.floor((Number(number) - 1) / 15);
  return {
    "--ball-base": colors[group],
    "--ball-color": colors[group],
    "--ball-shade": shades[group],
    "--ball-dark": ["#997207", "#0c5965", "#382066", "#8e383e", "#9b7d35"][group],
    "--ball-light": lights[group],
  } as CSSProperties;
}
