// Uma única malha de papel para a bolinha no globo, no voo e no histórico.
export const PAPER_BALL_FACES = [
  {
    points: [
      [18, 13],
      [43, 2],
      [70, 7],
      [53, 24],
      [29, 27],
    ],
    tone: "light",
  },
  {
    points: [
      [70, 7],
      [91, 24],
      [100, 51],
      [78, 40],
      [53, 24],
    ],
    tone: "base",
  },
  {
    points: [
      [100, 51],
      [92, 78],
      [69, 96],
      [72, 68],
      [78, 40],
    ],
    tone: "shade",
  },
  {
    points: [
      [69, 96],
      [40, 100],
      [14, 83],
      [31, 68],
      [72, 68],
    ],
    tone: "dark",
  },
  {
    points: [
      [14, 83],
      [1, 56],
      [6, 31],
      [18, 13],
      [29, 27],
      [31, 68],
    ],
    tone: "base",
  },
  {
    points: [
      [29, 27],
      [53, 24],
      [78, 40],
      [72, 68],
      [49, 80],
      [31, 68],
      [20, 47],
    ],
    tone: "light",
  },
] as const;
