import type { CSSProperties } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
function rosePath(name: string, d: string) {
  return <path className={`focus-rose__${name}`} d={d} />;
}
export function FocusRose({ progress, wilted }: { progress: number; wilted: boolean }) {
  useLanguage();

  return (
    <svg
      className={`focus-rose${wilted ? " is-wilted" : ""}`}
      viewBox="0 0 300 330"
      role="img"
      aria-label={wilted ? uiText(1955) : uiText(1956)}
      style={{ "--rose-growth": String(0.85 + progress * 0.15) } as CSSProperties}
    >
      {rosePath("dome-back", "M45 262V141C45 67 89 25 150 25s105 42 105 116v121Z")}
      {rosePath("shadow", "m82 263 69-18 67 20-67 16Z")}
      <g transform="translate(25 35)">
        <g className="focus-rose__plant">
          {rosePath("stem-shadow", "m118 211 15-116 13 3-13 116Z")}
          {rosePath("stem", "m111 211 14-118 12 4-13 117Z")}
          {rosePath("leaf focus-rose__leaf--left", "m119 164-56-39 10 48 45 17Z")}
          {rosePath("leaf-fold focus-rose__leaf-fold--left", "m63 125 56 39-46 9Z")}
          {rosePath("leaf focus-rose__leaf--right", "m130 143 53-38-9 48-45 18Z")}
          {rosePath("leaf-fold focus-rose__leaf-fold--right", "m183 105-53 38 44 10Z")}
          <g className="focus-rose__bloom">
            {rosePath(
              "petal focus-rose__petal--back",
              "m72 77 22-43 37 27 30-36 19 47-26 28-51 2Z",
            )}
            {rosePath("petal focus-rose__petal--left", "m67 74 45-18 12 47-35 25-28-29Z")}
            {rosePath("petal focus-rose__petal--right", "m124 57 43 8 22 34-31 31-39-27Z")}
            {rosePath("petal focus-rose__petal--front", "m89 82 37-24 35 27-7 42-47 5-25-28Z")}
            {rosePath("petal-fold", "m89 82 37 20 35-17-35-27Z")}
            {rosePath("center", "m107 82 20-11 20 14-7 24-25-2Z")}
          </g>
        </g>
      </g>
      {rosePath("dome-glass", "M45 262V141C45 67 89 25 150 25s105 42 105 116v121")}
      {rosePath("dome-shine", "M73 210v-66c0-47 18-79 49-94")}
      {rosePath("base-depth", "m29 272 19-18h205l19 18-18 31H48Z")}
      {rosePath("base", "m25 264 23-18h205l22 18-20 28H46Z")}
      {rosePath("base-fold", "m25 264 23-18h205l-19 18Z")}
    </svg>
  );
}
