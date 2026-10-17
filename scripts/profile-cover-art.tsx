import type { ProfileCover } from "../src/domain/profile-covers";

const palettes = {
  helena: ["#211830", "#392653", "#7433E0", "#A779EF", "#FFE88D"],
  solar: ["#44283B", "#82404B", "#EF8860", "#FACC15", "#FFF0B4"],
  aurora: ["#182C44", "#23496A", "#377B84", "#85CEB6", "#D3F4D7"],
  forest: ["#193F35", "#285D48", "#43946B", "#86BC78", "#FFE88D"],
  ocean: ["#172F51", "#205A82", "#2599AD", "#78D5DC", "#FFF9EF"],
} as const;

export function ProfileCoverArt({ theme }: { theme: ProfileCover }) {
  const [sky, far, near, light, accent] = palettes[theme];
  return (
    <svg
      width="1200"
      height="320"
      viewBox="0 0 1200 320"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      data-cover={theme}
    >
      <path fill={sky} d="M0 0h1200v320H0Z" />
      <path fill={far} d="M0 0h320L150 130 0 100ZM1200 0H960l120 180 120-60Z" />
      {theme === "helena" && (
        <>
          <path
            fill={light}
            d="m670 38 42 8-38 26-17 42 16 39 40 24-42 9-42-22-21-39 7-46 25-29Z"
          />
          <path
            fill={accent}
            d="m810 54 7 17 18 5-17 8-6 18-8-17-17-6 17-8ZM425 92l5 13 14 5-13 6-6 14-6-13-13-6 13-6Z"
          />
          <path fill={far} d="m200 180 110-95 87 116 133-54 152 120H200Z" />
          <path fill={near} d="m600 305 100-120 95 53 111-100 104 167Z" />
          <path fill={light} d="m700 185 29 70 66-17ZM906 138l-40 119 90-67Z" />
        </>
      )}
      {theme === "solar" && (
        <>
          <path
            fill={light}
            d="m650 26 59 18 40 50 5 62-31 55-58 27-63-10-46-44-17-61 20-59 46-33Z"
          />
          <path fill={accent} d="m650 26 15 212-63-10-46-44-17-61 20-59 46-33Z" />
          <path fill={sky} d="m657 50 48 18 27 44-5 52-36 39-52 11-45-25-23-47 10-50 37-33Z" />
          <path fill={near} d="M0 270 165 221l175 35 176-39 188 44 201-64 295 65v58H0Z" />
          <path fill={light} d="m705 261 200-64-65 71Z" />
        </>
      )}
      {theme === "aurora" && (
        <>
          <path fill={near} d="m150 0 240 92L650 0h170L450 155 180 58Z" />
          <path fill={light} d="m390 92 60 63L820 0H650Z" />
          <path fill={accent} d="m280 10 113 50 126-45-119 68Z" />
          <path fill={far} d="M0 320 250 147l150 126 140-122 155 133 195-171 310 207Z" />
          <path fill={accent} d="m890 113-48 96 48-19 49 19ZM540 151l-44 79 44-18 40 16Z" />
        </>
      )}
      {theme === "forest" && (
        <>
          <path fill={accent} d="m740 43 43 14 25 38-4 44-33 31-43 2-35-27-10-41 18-39Z" />
          <path fill={near} d="M0 260 180 208l220 33 170-57 225 73 230-47 175 45v65H0Z" />
          {[260, 380, 840, 965].map((x, i) => (
            <g key={x} transform={`translate(${x} ${i % 2 ? 30 : 0})`}>
              <path fill={sky} d="M-4 145h10v140H-4Z" />
              <path fill={light} d="m0 70 53 91H28l48 76H-74l46-76h-25Z" />
              <path fill={far} d="M0 70v167h76l-48-76h25Z" />
            </g>
          ))}
        </>
      )}
      {theme === "ocean" && (
        <>
          <path fill={accent} d="m755 42 34 10 24 29-1 39-25 28-37 5-32-21-12-34 15-34Z" />
          <path fill={far} d="M0 175 190 200l180-29 220 30 220-33 210 34 180-29v147H0Z" />
          <path fill={near} d="m0 243 165-42 170 67 173-48 220 56 192-60 280 41v63H0Z" />
          <path fill={light} d="m165 201 170 67-155-30-130 9ZM728 276l192-60 136 20-135 1Z" />
          <path fill={accent} d="m600 126 33 29-60-4ZM886 83l21 18-37-2Z" />
        </>
      )}
      <path fill={far} d="M0 300 160 261l190 59H0ZM1200 255l-240 65h240Z" />
      <path fill={accent} d="m470 48 4 6-4 6-4-6ZM930 39l3 5-3 5-3-5ZM560 102l3 4-3 4-3-4Z" />
    </svg>
  );
}
