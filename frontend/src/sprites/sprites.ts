import type { HeartFill, StageKey } from "../services/ripeness";
import { paint, shapeFromSpans, toRows, type Spans, type Sprite } from "./pixel";

const INK = "#3b3024";
const PAPER = "#fff8e7";

/** Left/right edges of the banana body per row; the stem is rows 0-3 and the tip rows 25-27. */
const BANANA_SPANS: Spans = [
  [[11, 12]], [[10, 13]], [[10, 13]], [[9, 13]], [[8, 14]], [[7, 14]], [[6, 14]], [[5, 15]],
  [[5, 15]], [[4, 15]], [[4, 15]], [[3, 15]], [[3, 15]], [[3, 15]], [[3, 15]], [[3, 15]],
  [[3, 16]], [[4, 16]], [[4, 16]], [[5, 17]], [[5, 17]], [[6, 17]], [[7, 17]], [[8, 17]],
  [[9, 17]], [[11, 17]], [[13, 17]], [[15, 17]],
];

const BANANA_COLORS: Record<StageKey, { b: string; h: string; s: string; k: string; p: string }> = {
  green: { b: "#a7c957", h: "#cfe48e", s: "#6a994e", k: "#386641", p: "#6a994e" },
  ripening: { b: "#d9d45b", h: "#efe995", s: "#a9a33c", k: "#386641", p: "#a9a33c" },
  ripe: { b: "#f9c74f", h: "#fde391", s: "#dfa43b", k: "#6b4f2a", p: "#b9822f" },
  "very-ripe": { b: "#f0b64a", h: "#f8d07c", s: "#cc8c33", k: "#6b4f2a", p: "#7a4e24" },
  overripe: { b: "#a07c47", h: "#bb9a66", s: "#76582f", k: INK, p: "#5a4126" },
};

const SPOTS: [number, number][] = [
  [9, 6], [12, 7], [5, 11], [14, 13], [5, 18], [13, 19], [8, 20], [11, 22], [5, 15], [10, 24], [14, 21], [8, 4], [15, 17], [7, 22],
];
const SPOT_COUNT: Record<StageKey, number> = { green: 0, ripening: 0, ripe: 2, "very-ripe": 6, overripe: SPOTS.length };

function bananaFace(grid: string[][], stage: StageKey): void {
  const openEyes = () => {
    paint(grid, "e", [[7, 12], [8, 12], [7, 13], [8, 13], [11, 12], [12, 12], [11, 13], [12, 13]]);
    paint(grid, "w", [[7, 12], [11, 12]]);
  };
  switch (stage) {
    case "green":
      openEyes();
      paint(grid, "m", [[9, 16], [10, 16]]);
      break;
    case "ripening":
      openEyes();
      paint(grid, "m", [[8, 15], [9, 16], [10, 16], [11, 15]]);
      break;
    case "ripe":
      paint(grid, "e", [[8, 12], [7, 13], [9, 13], [12, 12], [11, 13], [13, 13]]);
      paint(grid, "m", [[8, 15], [9, 15], [10, 15], [11, 15], [9, 16], [10, 16]]);
      paint(grid, "c", [[6, 15], [13, 15]]);
      break;
    case "very-ripe":
      openEyes();
      paint(grid, "e", [[7, 10], [8, 10], [11, 10], [12, 10]]);
      paint(grid, "e", [[8, 9], [11, 9]]);
      paint(grid, "m", [[8, 16], [9, 15], [10, 16], [11, 15]]);
      break;
    case "overripe":
      paint(grid, "w", [[6, 12], [8, 12], [7, 13], [6, 14], [8, 14], [11, 12], [13, 12], [12, 13], [11, 14], [13, 14]]);
      paint(grid, "m", [[9, 16], [10, 16], [11, 16]]);
      paint(grid, "r", [[11, 17]]);
      break;
  }
}

/** The banana character, drawn for one ripeness stage. */
export function bananaSprite(stage: StageKey): Sprite {
  const grid = shapeFromSpans(20, BANANA_SPANS);
  BANANA_SPANS.forEach((row, y) => {
    const [left, right] = row[0];
    if (y <= 3 || y >= 25) {
      paint(grid, y <= 3 ? "k" : "t", grid[y].flatMap((cell, x) => (cell === "b" ? [[x, y] as [number, number]] : [])));
      return;
    }
    if (grid[y][left + 1] === "b") grid[y][left + 1] = "h";
    if (y >= 8 && y <= 19 && grid[y][left + 2] === "b") grid[y][left + 2] = "h";
    if (grid[y][right - 1] === "b") grid[y][right - 1] = "s";
  });
  const onFace = (x: number, y: number) => x >= 6 && x <= 13 && y >= 9 && y <= 17;
  const spots = SPOTS.slice(0, SPOT_COUNT[stage]).filter(
    ([x, y]) => !onFace(x, y) && (grid[y][x] === "b" || grid[y][x] === "s"),
  );
  paint(grid, "p", spots);
  bananaFace(grid, stage);
  const colors = BANANA_COLORS[stage];
  return {
    rows: toRows(grid),
    palette: { o: INK, t: "#4a3a28", e: INK, w: PAPER, m: INK, c: "#f9844a", r: "#e4572e", ...colors },
  };
}

const HEART_ROWS = [".oo.oo.", "ohfofro", "offfffo", ".offfo.", "..ofo..", "...o..."];

export function heartSprite(fill: HeartFill): Sprite {
  const rows = HEART_ROWS.map((row) =>
    [...row]
      .map((cell, x) => {
        if (cell !== "f" && cell !== "h" && cell !== "r") return cell;
        if (fill === "empty" || (fill === "half" && x > 3)) return "x";
        return cell;
      })
      .join(""),
  );
  return { rows, palette: { o: INK, f: "#e4572e", r: "#e4572e", h: PAPER, x: "#e2d3ad" } };
}

export function cloudSprite(): Sprite {
  const grid = shapeFromSpans(18, [[[6, 10]], [[4, 12]], [[3, 14]], [[1, 16]], [[0, 17]], [[0, 17]], [[1, 16]]], "w");
  paint(grid, "v", [[2, 5], [3, 5], [4, 5], [5, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5]]);
  return { rows: toRows(grid), palette: { o: "#c9bf9c", w: PAPER, v: "#efe5c8" } };
}

/** A small apple sidekick for the hero scene. */
export function appleSprite(): Sprite {
  const grid = shapeFromSpans(
    11,
    [[], [], [[2, 4], [6, 8]], [[1, 9]], [[0, 10]], [[0, 10]], [[0, 10]], [[0, 10]], [[1, 9]], [[2, 8]], [[3, 4], [6, 7]]],
    "r",
  );
  paint(grid, "k", [[5, 0], [5, 1]]);
  paint(grid, "l", [[6, 1], [7, 1], [7, 0], [8, 0]]);
  paint(grid, "h", [[2, 4], [2, 5]]);
  paint(grid, "e", [[3, 6], [7, 6]]);
  paint(grid, "m", [[4, 8], [5, 8], [6, 8]]);
  paint(grid, "c", [[2, 7], [8, 7]]);
  return { rows: toRows(grid), palette: { o: INK, r: "#e4572e", k: "#6b4f2a", l: "#6a994e", h: "#f6a08a", e: INK, m: INK, c: "#f9844a" } };
}

export function flowerSprite(petal: string): Sprite {
  return {
    rows: [".o.o.", "opopo", ".oco.", "opopo", ".o.o.", "..g..", ".lg..", "..gl.", "..g.."],
    palette: { o: INK, p: petal, c: "#f9c74f", g: "#386641", l: "#6a994e" },
  };
}

/** One repeating tile of grass over soil. */
export const GROUND_TILE: Sprite = {
  rows: [
    "....g.......g...",
    "...gG.g....gGg..",
    "gGgGGGGgGGGgGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGDGGGGGGDGGGGGG",
    "DDDDDDDDDDDDDDDD",
    "dddddpdddddddddd",
    "dddddddddDdddddd",
    "ddpdddddddddddpd",
    "dddddddDdddddddd",
    "dddddddddddpdddd",
    "dDdddddddddddddd",
  ],
  palette: { g: "#a7c957", G: "#386641", D: "#6b4f2a", d: "#8b6b3d", p: "#b89b6a" },
};
